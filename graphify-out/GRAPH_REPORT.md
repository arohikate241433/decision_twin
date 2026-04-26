# Graph Report - Solution Challange 2026  (2026-04-26)

## Corpus Check
- 9 files · ~7,159 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 19 nodes · 12 edges · 1 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 1|Community 1]]

## God Nodes (most connected - your core abstractions)
1. `SyntheticDataRequest` - 2 edges
2. `SimulationRequest` - 2 edges
3. `ReportRequest` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 1 - "Community 1"
Cohesion: 0.5
Nodes (4): BaseModel, ReportRequest, SimulationRequest, SyntheticDataRequest

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SyntheticDataRequest` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `SimulationRequest` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `ReportRequest` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._