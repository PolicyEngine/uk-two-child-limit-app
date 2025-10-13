import './Results.css'

function Results({ data, policy }) {
  const formatCurrency = (value) => {
    return `£${(value / 1e9).toFixed(2)}bn`
  }

  const formatNumber = (value) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`
    }
    return value.toLocaleString('en-GB')
  }

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(2)}%`
  }

  return (
    <div className="results">
      <h2>Analysis Results</h2>

      <div className="results-grid">
        {/* Cost Section */}
        {data.cost && (
          <div className="result-card highlight">
            <h3>Cost Estimate</h3>
            <div className="result-value large">{formatCurrency(data.cost)}</div>
            {data.fullReformCost && (
              <div className="result-comparison">
                Full reform: {formatCurrency(data.fullReformCost)}
                <span className="percentage">
                  ({((data.cost / data.fullReformCost) * 100).toFixed(1)}% of full reform)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Families Affected */}
        {data.familiesAffected !== undefined && (
          <div className="result-card">
            <h3>Families Benefiting</h3>
            <div className="result-value">{formatNumber(data.familiesAffected)}</div>
            {data.totalAffectedFamilies && (
              <div className="result-detail">
                Out of {formatNumber(data.totalAffectedFamilies)} affected families
              </div>
            )}
          </div>
        )}

        {/* Children Impact */}
        {data.childrenNoLongerLimited !== undefined && (
          <div className="result-card">
            <h3>Children No Longer Limited</h3>
            <div className="result-value">{formatNumber(data.childrenNoLongerLimited)}</div>
            {data.totalLimitedChildren && (
              <div className="result-detail">
                Out of {formatNumber(data.totalLimitedChildren)} currently limited
              </div>
            )}
          </div>
        )}

        {/* Poverty Reduction */}
        {data.childrenOutOfPoverty !== undefined && (
          <div className="result-card highlight">
            <h3>Children Lifted from Poverty</h3>
            <div className="result-value">{formatNumber(data.childrenOutOfPoverty)}</div>
            {data.povertyRateReduction && (
              <div className="result-detail">
                Poverty rate reduction: {formatPercent(data.povertyRateReduction)}
              </div>
            )}
          </div>
        )}

        {/* Child Poverty Rates */}
        {data.baselinePovertyRate !== undefined && (
          <div className="result-card">
            <h3>Child Poverty Rate</h3>
            <div className="result-comparison-box">
              <div className="comparison-item">
                <span className="label">Baseline:</span>
                <span className="value">{formatPercent(data.baselinePovertyRate)}</span>
              </div>
              <div className="comparison-item">
                <span className="label">Reformed:</span>
                <span className="value">{formatPercent(data.reformedPovertyRate)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Cost Effectiveness */}
        {data.costPerChild !== undefined && (
          <div className="result-card">
            <h3>Cost per Child Lifted from Poverty</h3>
            <div className="result-value">£{formatNumber(Math.round(data.costPerChild))}</div>
          </div>
        )}
      </div>

      {/* Policy-specific details */}
      {data.policySpecific && (
        <div className="policy-specific-section">
          <h3>Policy-Specific Details</h3>
          <div className="detail-grid">
            {Object.entries(data.policySpecific).map(([key, value]) => (
              <div key={key} className="detail-item">
                <span className="detail-label">{key}:</span>
                <span className="detail-value">
                  {typeof value === 'number' && value > 1000
                    ? formatNumber(value)
                    : value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw output for debugging */}
      {data.rawOutput && (
        <details className="raw-output">
          <summary>View Detailed Analysis Output</summary>
          <pre>{data.rawOutput}</pre>
        </details>
      )}

      {/* Warnings */}
      {data.warnings && data.warnings.length > 0 && (
        <div className="warnings">
          <h4>⚠️ Important Notes</h4>
          {data.warnings.map((warning, idx) => (
            <p key={idx}>{warning}</p>
          ))}
        </div>
      )}
    </div>
  )
}

export default Results
