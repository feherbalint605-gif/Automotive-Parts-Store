---
name: Homepage section builder
description: Project requirements for the editable automotive storefront homepage.
---

Treat a saved empty homepage section list as intentional content, not as an uninitialized record. Keep the product catalog, footer contact details, and working contact and custom-print forms available while homepage sections are editable.

**Why:** The user requested section deletion and a modular homepage while preserving those existing storefront functions; reseeding an empty list would undo an admin's delete-all action.

**How to apply:** Any section initialization, migration, or rendering change must preserve an empty saved list across server restarts and keep the existing customer paths available.
