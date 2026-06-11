# Layered Verifier Roadmap

## Why

The current diagnosis chain already has TypeScript rules, StepVerifier candidates, Python verifier fallback, and VerifierTrace. That is enough for many high-school exercises, but not enough for parameter-for-all problems, conic transformations, geometry proofs, recurrence/induction, or long proof chains.

## Three Layers

### 1. Light verifier

Purpose: fast computational checks.

- SymPy algebra and calculus checks
- numeric sampling for equality, inequality, and boundary sanity checks
- geometry vector checks for projection, angle, distance, perpendicular, and plane relations

This layer can find counterexamples quickly, but it must not pretend to be a full proof engine.

### 2. High-school domain verifier

Purpose: topic-specific proof structure checks.

- parameter-for-all problems
- conic condition conversion
- recurrence and induction
- trigonometric identity transformations
- probability/statistics reading
- solid geometry proof structure

This is the main commercial product layer because it matches the Chinese high-school curriculum and student misconceptions.

### 3. Formal verifier

Purpose: high-confidence review only.

- Lean 4 adapter for formalizable claims
- auxiliary lemma generation
- retrieval of reusable proof patterns
- human review when translation confidence is low

This layer should be optional and asynchronous. It should not block the normal tutoring flow.

## GitHub References

- LeanAgent: use the lifelong proving idea, dynamic knowledge base, curriculum evolution, and retrieval improvement.
- Prover-Agent: use the informal reasoning plus Lean feedback plus auxiliary lemma structure.

This project does not copy their code. The first implementation is `layered-verifier-engine.ts`, a TypeScript-first protocol that can later call PRM, Lean, or Python services.

## Implemented Now

- `LayeredVerifierReport`
- light/domain/formal tier reports
- formal review plan
- auxiliary lemma hints
- curriculum and retrieval tags
- `layered_verifier_completed` event
- layered verifier traces for Inspector and evaluation

## Next

- Persist formal review candidates in a database table.
- Add a Python numeric sampling adapter for inequalities and parameter boundaries.
- Add a geometry vector verifier microservice.
- Add a Lean translation confidence gate before any formal call.
- Build a small domain verifier dataset for parameter, conic, sequence, trig, probability, and solid geometry.
