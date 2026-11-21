Context protocol (SKL-003), identical in every stateful skill:

1. Before reading or writing a home, read its `README.md`: it is the home's contract.
2. When the README is missing, setup has not run: run the skill's setup, ask its questions once and write the README.
3. When reading a context file, compare its `stale_after` with today; review or refresh a stale file before relying on it.
4. When the README's `generated.by` differs from this skill's version, migrate the home.
