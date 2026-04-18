import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from fairlearn.metrics import demographic_parity_difference, demographic_parity_ratio

app = FastAPI(title="DecisionTwin API", description="Provides simulation and AI endpoints for DecisionTwin.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "decisiontwin-hackathon")
LOCATION = "us-central1"

try:
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    gemini_pro = GenerativeModel("gemini-1.5-pro-preview-0409")
    AI_ENABLED = True
except Exception as e:
    print(f"Vertex AI not initialized, falling back to mock data: {e}")
    AI_ENABLED = False

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "DecisionTwin API is running", "ai_enabled": AI_ENABLED}

class SyntheticDataRequest(BaseModel):
    persona_count: int = 100
    characteristics: list[str] = ["age_group", "gender", "race", "income", "credit_score", "location"]

@app.post("/generate-synthetic-data")
def generate_synthetic_data(request: SyntheticDataRequest):
    if not AI_ENABLED:
        with open("mock_personas.json", "w") as f:
            mock_data = [
                {
                    "persona_id": f"p_{i}", 
                    "traits": {
                        "age_group": "18-24" if i % 3 == 0 else "25-40", 
                        "gender": "Male" if i % 2 == 0 else "Female",
                        "race": "GroupA" if i % 3 == 0 else "GroupB",
                        "credit_score": 620 + (i % 100), 
                        "income": 40000 + (i * 100)
                    }, 
                    "metadata": {"gemini_seed_id": "mock"}
                } 
                for i in range(request.persona_count)
            ]
            json.dump(mock_data, f)
        return {"status": "success", "source": "mock", "data": mock_data}

    prompt = f"""
    You are an expert synthetic data generator for an AI ethical auditing platform called DecisionTwin.
    Generate a highly realistic, statistically diverse dataset of {request.persona_count} individuals.
    
    Include the following characteristics: {', '.join(request.characteristics)}.
    Ensure representation across intersections (e.g., race, gender, socio-economic status).
    Provide subtle, realistic correlations between features (e.g., location correlating with income).

    Format the output strictly as a JSON array where each object contains a 'persona_id' and 'traits' dictionary.
    """
    
    try:
        response = gemini_pro.generate_content(
            prompt,
            generation_config=GenerationConfig(
                temperature=0.7,
                response_mime_type="application/json"
            )
        )
        
        result_json = json.loads(response.text)
        with open("mock_personas.json", "w") as f:
            json.dump(result_json, f)
            
        return {"status": "success", "source": "gemini", "data": result_json[:5], "total": len(result_json)}
        
    except Exception as e:
        print(f"Vertex AI not initialized, falling back to mock data: {e}")
        with open("mock_personas.json", "w") as f:
            mock_data = [
                {
                    "persona_id": f"p_{i}", 
                    "traits": {
                        "age_group": "18-24" if i % 3 == 0 else "25-40", 
                        "gender": "Male" if i % 2 == 0 else "Female",
                        "race": "GroupA" if i % 3 == 0 else "GroupB",
                        "credit_score": 620 + (i % 100), 
                        "income": 40000 + (i * 100)
                    }, 
                    "metadata": {"gemini_seed_id": "mock_fallback"}
                } 
                for i in range(request.persona_count)
            ]
            json.dump(mock_data, f)
        return {"status": "success", "source": "mock_fallback", "data": mock_data[:5], "total": len(mock_data)}


class SimulationRequest(BaseModel):
    years_to_simulate: int = 5
    sensitive_feature: str = "gender"
    threshold_adjustment: float = 0.0

@app.post("/simulate-bias")
def simulate_bias(request: SimulationRequest):
    # Phase 3: Core ML Model & Bias Logic
    # In a real app we'd load this from DB/Vertex context. Using the mock file for the hackathon.
    try:
        with open("mock_personas.json", "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=400, detail="Generate synthetic data first.")

    # Flatten traits into a DataFrame
    df = pd.DataFrame([item["traits"] for item in data])

    if request.sensitive_feature not in df.columns:
        raise HTTPException(status_code=400, detail=f"Sensitive feature '{request.sensitive_feature}' not found in dataset. Available: {list(df.columns)}")

    # Encode all string columns to numeric using factorize (handles mixed types safely)
    for col in df.columns:
        if df[col].dtype == 'object' or df[col].apply(lambda x: isinstance(x, str)).any():
            df[col], _ = pd.factorize(df[col])

    # Capture sensitive_vals AFTER encoding so it's always numeric
    sensitive_vals = df[request.sensitive_feature]
            
    # Phase 3: Core ML Model & Bias Logic (Compounding Feedback Loops)
    # The DecisionTwin magic: As years progress, we simulate mathematical drift 
    # where the marginalized group (encoded as 0) experiences a slowly increasing threshold penalty.
    drift_penalty_per_year = 4.0
    
    synthetic_targets = []
    
    # Normalizing threshold (lower threshold adjustment means easier to get approved)
    for i, row in df.iterrows():
        base_score = float(row['credit_score'])
        
        # Introduce compounding bias per year for the '0' label group (marginalized)
        if row[request.sensitive_feature] == 0:
            year_penalty = request.years_to_simulate * drift_penalty_per_year
        else:
            year_penalty = 0
            
        # Target threshold: 650 base. Adjust it based on Policy Lab sliders + The compounding bias penalty
        approval_threshold = 650.0 - request.threshold_adjustment + year_penalty
        
        synthetic_targets.append(1 if base_score > approval_threshold else 0)
        
    df['synthetic_target'] = synthetic_targets
    
    X = df.drop(columns=['synthetic_target'])
    y = df['synthetic_target']
    
    # Train mock decision model to learn the biased embedded logic
    clf = LogisticRegression()
    clf.fit(X, y)
    predictions = clf.predict(X)
    
    # Calculate Disparity using Fairlearn
    try:
        dp_diff = demographic_parity_difference(y, predictions, sensitive_features=sensitive_vals)
        dp_ratio = demographic_parity_ratio(y, predictions, sensitive_features=sensitive_vals)
    except:
        # Fallback if math fails (e.g., all 0 or all 1)
        dp_diff = 0.0
        dp_ratio = 1.0
    
    return {
        "status": "success",
        "years_simulated": request.years_to_simulate,
        "metrics": {
            "demographic_parity_difference": round(dp_diff, 4),
            "demographic_parity_ratio": round(dp_ratio, 4),
            "approval_rate_overall": round(predictions.mean(), 4)
        },
        "bias_flags": [
            {
                "category": f"Demographic Disparity on {request.sensitive_feature}",
                "severity": "High" if dp_ratio < 0.8 else "Low",  # The 80% Rule
                "value": round(dp_ratio, 4)
            }
        ]
    }

class ReportRequest(BaseModel):
    demographic_parity_ratio: float
    demographic_parity_difference: float
    sensitive_feature: str
    years_simulated: int

@app.post("/generate-report")
def generate_report(request: ReportRequest):
    if not AI_ENABLED:
        return {"status": "success", "report": f"Mock AI Review [{request.years_simulated} Years]: The demographic parity ratio of {request.demographic_parity_ratio} indicates systematic disparity. Immediate policy threshold review recommended."}
        
    prompt = f"""
    Act as an AI Ethics consultant. Given these statistical biases from a {request.years_simulated}-year simulation:
    - Sensitive Feature: {request.sensitive_feature}
    - Demographic Parity Ratio (80% rule): {request.demographic_parity_ratio}
    - Demographic Parity Difference: {request.demographic_parity_difference}
    
    Write a concise 1-paragraph summary explaining the business impact and systemic risk to non-technical executives. 
    Be direct, professional, and forensic.
    """
    
    try:
        response = gemini_pro.generate_content(
            prompt,
            generation_config=GenerationConfig(temperature=0.4)
        )
        return {"status": "success", "report": response.text.strip()}
    except Exception as e:
        print(f"Vertex AI report error: {e}. Falling back to mock report.")
        return {
            "status": "success", 
            "report": f"Mock AI Review [{request.years_simulated} Years]: Systemic divergence detected. The demographic parity ratio of {request.demographic_parity_ratio} indicates algorithmic polarization. A policy threshold review is strongly recommended to neutralize compounding disparities on {request.sensitive_feature}."
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
