## ML Pipeline notebook guidelines

For each pipeline, submit a Jupyter notebook (`.ipynb`) in your team’s GitHub repository under `ml-pipelines/`.

- **Naming**: Use a descriptive filename (e.g., `donor-churn-classifier.ipynb`, `reintegration-readiness.ipynb`).
- **Expectation**: Each notebook should be **self-contained** and tell the complete story from **problem framing** through **deployment**.

### Required notebook sections

1. **Problem framing**
   - Explain (in writing, not just code) the business problem, who cares about it, and why it matters.
   - State whether your approach is **predictive** or **explanatory**, and justify that choice using the textbook framework.

2. **Data acquisition, preparation & exploration**
   - Load the relevant data.
   - Explore it visually and statistically; document findings (distributions, correlations, missing values, outliers).
   - Prepare the data for modeling.
   - Show feature engineering decisions and explain why you made them.
   - If joining multiple tables, explain the join logic.
   - Build this as a **reproducible pipeline** (Ch. 7), not a one-off script.

3. **Modeling & feature selection**
   - Build your model(s) and document your choices.
   - Justify feature selection.
   - If you try multiple algorithms, show comparisons.
   - Include hyperparameter tuning when relevant.
   - If **explanatory**: discuss what the model reveals about relationships.
   - If **predictive**: focus on out-of-sample performance.

4. **Evaluation & interpretation**
   - Evaluate using appropriate metrics.
   - Use proper validation (train/test split, cross-validation).
   - Interpret results in business terms (not just \(R^2\) / accuracy).
   - Discuss real-world consequences of false positives/negatives in this context.

5. **Causal and relationship analysis (critical)**
   - Provide written analysis of the relationships you discovered.
   - Identify the most important features and explain why.
   - Discuss whether relationships make theoretical sense.
   - If **explanatory**: what causal story do coefficients/feature importances suggest?
   - Be clear about what is **causal vs. correlational** (correlation is not causation).
   - If **predictive**: explain what the model reveals about the data structure even if causal inference isn’t the goal.
   - Be honest about limitations and when you can/cannot make causal claims.

6. **Deployment notes**
   - Describe how the model is deployed and integrated into the web application (e.g., API endpoint, dashboard component, interactive form).
   - Include relevant code snippets or references to where integration code lives in the repo.

### Execution requirements

The notebook must be **fully executable**. A TA should be able to run it top-to-bottom and reproduce results.

- **Paths**: Ensure data paths are correct relative to the repository structure.
- **App integration**: The deployed web app should include model outputs in a meaningful way (predictions, dashboards, interactive tools, etc.) as described in the rubric’s Deployment & Integration section.

### Important notes

- **Distinct problems**: Each pipeline must address a genuinely different business problem (not the same problem with different algorithms).
- **Quality over quantity**: Focus on doing each pipeline well before starting the next one.
- **Deductions**: Non-executable notebooks or notebooks lacking written analysis will receive significant deductions regardless of model quality.
