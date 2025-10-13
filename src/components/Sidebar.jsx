import { useState } from 'react'
import './Sidebar.css'

const policies = [
  {
    id: 'full-abolition',
    name: 'Full Abolition',
    description: 'Complete removal of two-child limit',
  },
  {
    id: 'three-child-limit',
    name: 'Three-Child Limit',
    description: 'Move from two-child to three-child limit',
  },
  {
    id: 'under-five-exemption',
    name: 'Under-Five Exemption',
    description: 'Exempt children under specified age',
  },
  {
    id: 'disabled-child-exemption',
    name: 'Disabled Child Exemption',
    description: 'Exempt families with disabled children',
  },
  {
    id: 'working-families-exemption',
    name: 'Working Families Exemption',
    description: 'Exempt families where adults work',
  },
  {
    id: 'lower-third-child-element',
    name: 'Lower Third+ Child Element',
    description: 'Reduced element for 3rd+ children',
  },
]

function Sidebar({ selectedPolicy, onSelectPolicy, params, onParamChange, onAnalyze, loading, selectedYear, onYearChange }) {
  const [showPolicyList, setShowPolicyList] = useState(false)

  const selectedPolicyInfo = policies.find(p => p.id === selectedPolicy)

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
              max="9"
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
              min="3"
              max="9"
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
                step="0.1"
                value={params.reductionRate || 0.7}
                onChange={(e) => onParamChange('reductionRate', parseFloat(e.target.value))}
              />
              <span className="slider-value">
                {Math.round((params.reductionRate || 0.7) * 100)}%
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

  const handlePolicySelect = (policyId) => {
    onSelectPolicy(policyId)
    setShowPolicyList(false)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Policy Reforms</h2>

        {/* Selected Policy Display */}
        <div className="selected-policy-display">
          <button
            className="policy-selector-button"
            onClick={() => setShowPolicyList(!showPolicyList)}
          >
            <div className="selected-policy-info">
              <div className="policy-name">{selectedPolicyInfo?.name || 'Select Policy'}</div>
              <div className="policy-description">{selectedPolicyInfo?.description}</div>
            </div>
            <span className="dropdown-arrow">{showPolicyList ? '▲' : '▼'}</span>
          </button>
        </div>

        {/* Policy List (shown when expanded) */}
        {showPolicyList && (
          <div className="policy-dropdown">
            <nav className="sidebar-nav">
              {policies.map((policy) => (
                <button
                  key={policy.id}
                  className={`policy-option ${selectedPolicy === policy.id ? 'active' : ''}`}
                  onClick={() => handlePolicySelect(policy.id)}
                >
                  <div className="policy-name">{policy.name}</div>
                  <div className="policy-description">{policy.description}</div>
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Configure Parameters - moved here for better positioning */}
        {selectedPolicy && (
          <div className="policy-parameters-inline">
            <h3>Configure Parameters</h3>
            <div className="param-content">
              {renderParameterInputs()}
            </div>
          </div>
        )}
      </div>

      {selectedPolicy && (
        <div className="policy-parameters">
          {/* Year Selector */}
          <div className="year-selector-section">
            <label htmlFor="year-select" className="year-label">Analysis Year:</label>
            <select
              id="year-select"
              className="year-selector"
              value={selectedYear}
              onChange={(e) => onYearChange(e.target.value)}
            >
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
              <option value="2029">2029</option>
            </select>
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
      )}
    </aside>
  )
}

export default Sidebar
