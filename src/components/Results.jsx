import { useEffect, useRef } from 'react'
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

  // Animated Number Component
  const AnimatedNumber = ({ value, formatter = (v) => v }) => {
    const ref = useRef(null)
    const previousValue = useRef(value)

    useEffect(() => {
      if (!ref.current || previousValue.current === value) return

      const element = ref.current
      const start = previousValue.current || 0
      const end = value
      const duration = 800
      const startTime = performance.now()

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Ease-out cubic function for smooth deceleration
        const easeOutCubic = 1 - Math.pow(1 - progress, 3)
        const current = start + (end - start) * easeOutCubic

        element.textContent = formatter(current)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          element.textContent = formatter(end)
          previousValue.current = end
        }
      }

      requestAnimationFrame(animate)
    }, [value, formatter])

    return <span ref={ref}>{formatter(value)}</span>
  }

  return (
    <div className="results">
      <h2>Analysis results</h2>

      <div className="results-grid">
        {/* Cost Section */}
        {data.cost && (
          <div className="result-card highlight">
            <h3>Cost estimate</h3>
            <div className="result-value large">
              <AnimatedNumber value={data.cost} formatter={formatCurrency} />
            </div>
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
            <h3>Families benefiting</h3>
            <div className="result-value">
              <AnimatedNumber value={data.familiesAffected} formatter={formatNumber} />
            </div>
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
            <h3>Children no longer limited</h3>
            <div className="result-value">
              <AnimatedNumber value={data.childrenNoLongerLimited} formatter={formatNumber} />
            </div>
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
            <h3>Children lifted from poverty</h3>
            <div className="result-value">
              <AnimatedNumber value={data.childrenOutOfPoverty} formatter={formatNumber} />
            </div>
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
            <h3>Child poverty rate</h3>
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
            <h3>Cost per child lifted from poverty</h3>
            <div className="result-value">£{formatNumber(Math.round(data.costPerChild))}</div>
          </div>
        )}
      </div>

      {/* Policy-specific details */}
      {data.policySpecific && (
        <div className="policy-specific-section">
          <h3>Policy-specific details</h3>
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
          <summary>View detailed analysis output</summary>
          <pre>{data.rawOutput}</pre>
        </details>
      )}

      {/* Warnings */}
      {data.warnings && data.warnings.length > 0 && (
        <div className="warnings">
          <h4>⚠️ Important notes</h4>
          {data.warnings.map((warning, idx) => (
            <p key={idx}>{warning}</p>
          ))}
        </div>
      )}
    </div>
  )
}

export default Results
