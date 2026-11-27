# Architecture
- Keep a shared product/kit catalog with company-specific identifiers and prices; the equipment is shared while ERP codes and commercial bases differ.
- Select catalog prices by the proposal branch and never fall back from missing Graber prices to Emive prices; this prevents cross-company pricing mistakes.
- Preserve deprecated minimum-price columns for deployed-client compatibility, but new application code must not consume them.
- Recalculate kit bases with database triggers after component price or quantity changes; every editing path must keep company totals synchronized.
- Store the proposal branch on its session rather than taking it from the viewer; shared sessions must retain their original company's catalog.
