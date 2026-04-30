# CapEvents AI Datasets

## Data strategy

The AI service uses a hybrid data strategy:

1. CapEvents internal data is the source of truth.
2. External public datasets can be used only for pretraining, testing, augmentation, or cold-start scenarios.
3. Final evaluation must always be done on CapEvents data.
4. Each row in processed datasets must include a `data_source` column.

## Folders

- `raw/capevents/`: exports from the CapEvents PostgreSQL database.
- `external/kaggle/`: authorized public datasets.
- `processed/`: cleaned and feature-engineered datasets.
- `splits/`: train / validation / test splits.

## Required processed column

Every processed dataset must include:

```text
data_source