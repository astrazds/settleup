# Centralize Event Record mutations

SettleUp will keep the `AppStore` seam with `MemoryStore` and `D1Store` adapters, but Event mutation rules belong in one Event Record module rather than being reimplemented in each adapter. The Event Record module owns Participant, Expense, Share, and Settlement Payment invariants; storage adapters load and persist records. D1 adapter tests use Miniflare with the checked-in migrations so query behavior is verified against the schema instead of a hand-written SQL fake.
