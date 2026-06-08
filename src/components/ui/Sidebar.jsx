import { useState } from 'react';
import {
  CHOREOGRAPHY_CATEGORIES,
  PROP_CATALOG_CATEGORIES,
} from '../../constants/props.js';
import { STAGE_ENCLOSURE_HEIGHT_LIMITS } from '../../constants/stage.js';
import { STAGE_LIMITS } from '../../constants/props.js';
import { useStageStore } from '../../store/stageStore.js';
import { DimensionControl } from './DimensionControl.jsx';
import { PropList } from './PropList.jsx';
import { GroundColorPicker } from './GroundColorPicker.jsx';
import { SkyColorPicker } from './SkyColorPicker.jsx';
import { StageTexturePicker } from './StageTexturePicker.jsx';
import { StageEnclosurePicker } from './StageEnclosurePicker.jsx';

export function Sidebar() {
  const stage = useStageStore((s) => s.stage);
  const skyColor = useStageStore((s) => s.skyColor);
  const groundColor = useStageStore((s) => s.groundColor);
  const stageTexture = useStageStore((s) => s.stageTexture);
  const curtainDuration = useStageStore((s) => s.curtainDuration);
  const setStageDimension = useStageStore((s) => s.setStageDimension);
  const setSkyColor = useStageStore((s) => s.setSkyColor);
  const setGroundColor = useStageStore((s) => s.setGroundColor);
  const setStageTexture = useStageStore((s) => s.setStageTexture);
  const setCurtainDuration = useStageStore((s) => s.setCurtainDuration);
  const showStageBaseline = useStageStore((s) => s.showStageBaseline);
  const showStageAreaGrid = useStageStore((s) => s.showStageAreaGrid);
  const showStageZones = useStageStore((s) => s.showStageZones);
  const showStageEnclosure = useStageStore((s) => s.showStageEnclosure);
  const stageEnclosureHeight = useStageStore((s) => s.stageEnclosureHeight);
  const setShowStageBaseline = useStageStore((s) => s.setShowStageBaseline);
  const setShowStageAreaGrid = useStageStore((s) => s.setShowStageAreaGrid);
  const setShowStageZones = useStageStore((s) => s.setShowStageZones);
  const setShowStageEnclosure = useStageStore((s) => s.setShowStageEnclosure);
  const setStageEnclosureHeight = useStageStore((s) => s.setStageEnclosureHeight);
  const props = useStageStore((s) => s.props);
  const placementType = useStageStore((s) => s.placementType);
  const mode = useStageStore((s) => s.mode);
  const snapToGrid = useStageStore((s) => s.snapToGrid);
  const startPlacement = useStageStore((s) => s.startPlacement);
  const cancelPlacement = useStageStore((s) => s.cancelPlacement);
  const addProp = useStageStore((s) => s.addProp);
  const toggleSnap = useStageStore((s) => s.toggleSnap);
  const triggerDancerPlay = useStageStore((s) => s.triggerDancerPlay);
  const hiddenCount = props.filter((p) => !p.visible).length;
  const stageCurtainExists = props.some((p) => p.type === 'stage_curtain');
  const dancerProps = props.filter((p) => p.type === 'dancer');
  const [stagePanelOpen, setStagePanelOpen] = useState(true);
  const [propSearch, setPropSearch] = useState('');
  const [selectedDancerIds, setSelectedDancerIds] = useState([]);
  const [openCategories, setOpenCategories] = useState(() =>
    Object.fromEntries(PROP_CATALOG_CATEGORIES.map((category) => [category.id, true])),
  );
  const selectedLiveDancerIds = selectedDancerIds.filter((id) =>
    dancerProps.some((dancer) => dancer.id === id),
  );
  const allDancersSelected =
    dancerProps.length > 0 && selectedLiveDancerIds.length === dancerProps.length;

  const normalizedSearch = propSearch.trim().toLowerCase();
  const filteredCategories = PROP_CATALOG_CATEGORIES.map((category) => ({
    ...category,
    items: category.items.filter((item) => {
      if (!normalizedSearch) return true;
      const haystack = `${item.label} ${item.description} ${category.label}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    }),
  })).filter((category) => category.items.length > 0);
  const hasPropSearch = normalizedSearch.length > 0;

  const toggleCategory = (categoryId) => {
    setOpenCategories((current) => ({
      ...current,
      [categoryId]: !(current[categoryId] ?? true),
    }));
  };

  const handlePropCardClick = (type) => {
    if (type === 'stage_curtain') {
      addProp({ type });
      return;
    }
    if (placementType === type && mode === 'place') {
      cancelPlacement();
      return;
    }
    startPlacement(type);
  };

  const toggleDancerSelect = (id) => {
    setSelectedDancerIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  };

  const toggleAllDancers = () => {
    setSelectedDancerIds(
      allDancersSelected ? [] : dancerProps.map((dancer) => dancer.id),
    );
  };

  const handlePlaySelectedDancers = () => {
    if (selectedLiveDancerIds.length === 0) return;
    triggerDancerPlay(selectedLiveDancerIds);
  };

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h1>🎭 Stage Studio Pro</h1>
      </header>

      <section className="panel">
        <div className="panel-title-row">
          <h2>Stage</h2>
          <button
            type="button"
            className={`panel-collapse-btn ${stagePanelOpen ? '' : 'panel-collapse-btn--closed'}`}
            onClick={() => setStagePanelOpen((v) => !v)}
            title={stagePanelOpen ? 'Hide stage panel' : 'Show stage panel'}
            aria-label={stagePanelOpen ? 'Hide stage panel' : 'Show stage panel'}
          >
            {stagePanelOpen ? '▾' : '▸'}
          </button>
        </div>
        {stagePanelOpen && (
          <>
            <StageTexturePicker value={stageTexture} onChange={setStageTexture} />
            <DimensionControl label="Length" value={stage.length}
              min={STAGE_LIMITS.length.min} max={STAGE_LIMITS.length.max}
              step={1} inputStep={0.1} unit="m"
              onChange={(v) => setStageDimension('length', v)} />
            <DimensionControl label="Width" value={stage.width}
              min={STAGE_LIMITS.width.min} max={STAGE_LIMITS.width.max}
              step={1} inputStep={0.1} unit="m"
              onChange={(v) => setStageDimension('width', v)} />
            <DimensionControl label="Height" value={stage.height}
              min={STAGE_LIMITS.height.min} max={STAGE_LIMITS.height.max}
              step={0.1} inputStep={0.1} unit="m"
              onChange={(v) => setStageDimension('height', v)} />
            <DimensionControl label="Curtain duration" value={curtainDuration}
              min={1} max={15} step={0.5} inputStep={0.5} unit="s"
              onChange={(v) => setCurtainDuration(v)} />
            <label className="toggle stage-toggle">
              <input type="checkbox" checked={showStageBaseline}
                onChange={(e) => setShowStageBaseline(e.target.checked)} />
              Center cross
            </label>
            <label className="toggle stage-toggle">
              <input type="checkbox" checked={showStageAreaGrid}
                onChange={(e) => setShowStageAreaGrid(e.target.checked)} />
              Area grid
            </label>
            <label className="toggle stage-toggle">
              <input type="checkbox" checked={showStageZones}
                onChange={(e) => setShowStageZones(e.target.checked)} />
              Stage zones
            </label>
            <label className="toggle stage-toggle">
              <input type="checkbox" checked={showStageEnclosure}
                onChange={(e) => setShowStageEnclosure(e.target.checked)} />
              Stage walls
            </label>
            {showStageEnclosure && (
              <>
                <DimensionControl label="Wall height" value={stageEnclosureHeight}
                  min={STAGE_ENCLOSURE_HEIGHT_LIMITS.min} max={STAGE_ENCLOSURE_HEIGHT_LIMITS.max}
                  step={0.5} inputStep={0.1} unit="m"
                  onChange={setStageEnclosureHeight} />
                <StageEnclosurePicker />
              </>
            )}
          </>
        )}
      </section>

      <PropList />

      <section className="panel">
        <div className="panel-title-row">
          <h2>Props</h2>
          <label className="toggle">
            <input type="checkbox" checked={snapToGrid} onChange={toggleSnap} />
            Snap
          </label>
        </div>
        {mode === 'place' && (
          <p className="placement-banner">Click stage to place · Esc cancel</p>
        )}
        <label className="prop-search">
          <span className="prop-search-icon" aria-hidden>⌕</span>
          <input
            type="search"
            value={propSearch}
            placeholder="Search props"
            aria-label="Search props"
            onChange={(e) => setPropSearch(e.target.value)}
          />
          {propSearch && (
            <button
              type="button"
              className="prop-search-clear"
              onClick={() => setPropSearch('')}
              aria-label="Clear prop search"
              title="Clear prop search"
            >
              ×
            </button>
          )}
        </label>
        {filteredCategories.map((category) => {
          const isOpen = hasPropSearch || (openCategories[category.id] ?? true);
          const panelId = `prop-category-${category.id}`;
          return (
          <div key={category.id} className="prop-category">
            <button
              type="button"
              className="prop-category-toggle"
              onClick={() => toggleCategory(category.id)}
              aria-expanded={isOpen}
              aria-controls={panelId}
            >
              <span className="prop-category-title">{category.label}</span>
              <span className="prop-category-count">{category.items.length}</span>
              <span className="prop-category-chevron" aria-hidden>{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && (
              <div className="prop-grid" id={panelId}>
                {category.items.map((item) => {
                  const isStageCurtain = item.type === 'stage_curtain';
                  const displayLabel =
                    isStageCurtain && stageCurtainExists ? 'Select Curtain' : item.label;
                  return (
                    <button key={item.type} type="button"
                      className={[
                        'prop-card',
                        placementType === item.type ? 'active' : '',
                        isStageCurtain ? 'prop-card--special' : '',
                        isStageCurtain && stageCurtainExists ? 'prop-card--locked' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => handlePropCardClick(item.type)} title={displayLabel}>
                      <span className="prop-icon">{item.icon}</span>
                      <span className="prop-label">{displayLabel}</span>
                      {isStageCurtain && stageCurtainExists && (
                        <span className="prop-card-status">Placed</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          );
        })}
        {filteredCategories.length === 0 && (
          <p className="prop-search-empty">No matching props</p>
        )}
        {mode === 'place' && (
          <button type="button" className="btn secondary" onClick={cancelPlacement}>Cancel</button>
        )}
      </section>

      <section className="panel choreography-sidebar-panel">
        <div className="panel-title-row">
          <h2>Choreography</h2>
          {dancerProps.length > 0 && (
            <span className="panel-count">{dancerProps.length}</span>
          )}
        </div>
        {CHOREOGRAPHY_CATEGORIES.map((category) => (
          <div key={category.id} className="prop-category">
            <div className="prop-grid">
              {category.items.map((item) => (
                <button key={item.type} type="button"
                  className={[
                    'prop-card',
                    'prop-card--choreography',
                    placementType === item.type ? 'active' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => handlePropCardClick(item.type)} title={item.label}>
                  <span className="prop-icon">{item.icon}</span>
                  <span className="prop-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {dancerProps.length > 0 ? (
          <div className="dancer-playback-list">
            <label className="toggle dancer-playback-toggle">
              <input type="checkbox" checked={allDancersSelected}
                onChange={toggleAllDancers} />
              Select all dancers
            </label>
            <div className="dancer-playback-items">
              {dancerProps.map((dancer) => (
                <label key={dancer.id} className="toggle dancer-playback-toggle">
                  <input type="checkbox"
                    checked={selectedDancerIds.includes(dancer.id)}
                    onChange={() => toggleDancerSelect(dancer.id)} />
                  {dancer.tag || 'Dancer'}
                </label>
              ))}
            </div>
            <button type="button" className="btn btn-compact primary dancer-playback-btn"
              disabled={selectedLiveDancerIds.length === 0}
              onClick={handlePlaySelectedDancers}>
              <span aria-hidden>▶</span>
              Play selected
            </button>
          </div>
        ) : (
          <p className="choreography-empty-state">No dancers on stage</p>
        )}
        {mode === 'place' && placementType === 'dancer' && (
          <button type="button" className="btn secondary" onClick={cancelPlacement}>Cancel</button>
        )}
      </section>

      <section className="panel">
        <h2>Environment</h2>
        <SkyColorPicker color={skyColor} onChange={setSkyColor} />
        <GroundColorPicker color={groundColor} onChange={setGroundColor} />
      </section>

      <section className="panel panel-footer">
        <p className="stats">
          {props.length} props
          {hiddenCount > 0 ? ` · ${hiddenCount} hidden` : ''}
        </p>
      </section>
    </aside>
  );
}
