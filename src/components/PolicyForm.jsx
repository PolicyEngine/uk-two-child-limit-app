import './PolicyForm.css'

function PolicyForm({ selectedPolicy, params, onParamChange, onAnalyze, loading }) {
  const renderParameterInputs = () => {
    switch (selectedPolicy) {
      case 'full-abolition':
        return (
          <div className="param-info">
            <p>This policy removes the two-child limit completely. No additional parameters needed.</p>
          </div>
        )

      case 'three-child-limit':
        return (
          <div className="param-group">
            <label htmlFor="childLimit">
              Child Limit
              <span className="param-description">
                Support provided for up to this many children
              </span>
            </label>
            <input
              id="childLimit"
              type="number"
              min="3"
              max="10"
              value={params.childLimit || 3}
              onChange={(e) => onParamChange('childLimit', parseInt(e.target.value))}
            />
          </div>
        )

      case 'under-five-exemption':
        return (
          <div className="param-group">
            <label htmlFor="ageLimit">
              Age Exemption Threshold (years)
              <span className="param-description">
                Children under this age are exempt from the limit
              </span>
            </label>
            <input
              id="ageLimit"
              type="number"
              min="1"
              max="18"
              value={params.ageLimit || 5}
              onChange={(e) => onParamChange('ageLimit', parseInt(e.target.value))}
            />
          </div>
        )

      case 'disabled-child-exemption':
        return (
          <div className="param-info">
            <p>Families with at least one disabled child receiving DLA or PIP are exempt from the limit.</p>
            <p className="note">No additional parameters needed.</p>
          </div>
        )

      case 'working-families-exemption':
        return (
          <div className="param-info">
            <p>Families where at least one adult has employment income are exempt from the limit.</p>
            <p className="note">The limit only applies to out-of-work families.</p>
          </div>
        )

      case 'lower-third-child-element':
        return (
          <div className="param-group">
            <label htmlFor="reductionRate">
              Third+ Child Element Rate
              <span className="param-description">
                Percentage of standard child element for 3rd+ children
              </span>
            </label>
            <div className="slider-container">
              <input
                id="reductionRate"
                type="range"
                min="0.5"
                max="1"
                step="0.01"
                value={params.reductionRate || 0.67}
                onChange={(e) => onParamChange('reductionRate', parseFloat(e.target.value))}
              />
              <span className="slider-value">
                {Math.round((params.reductionRate || 0.67) * 100)}%
              </span>
            </div>
            <div className="slider-labels">
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="policy-form">
      <h2>Configure Policy Parameters</h2>
      <div className="form-content">
        {renderParameterInputs()}
      </div>
      <button
        className="analyze-button"
        onClick={onAnalyze}
        disabled={loading}
      >
        {loading ? (
          <>
            <span className="spinner"></span>
            Analyzing...
          </>
        ) : (
          'Run Analysis'
        )}
      </button>
    </div>
  )
}

export default PolicyForm
