import { useCallback, useEffect, useRef } from 'react';
import { PROP_CATALOG, PROP_SCALE_LIMITS, PROP_TAG_MAX_LENGTH } from '../../constants/props.js';
import { getPropCatalogSpec } from '../../constants/propCatalogSpecs.js';
import { STAGE_CURTAIN_HEIGHT_LIMITS } from '../../constants/stage.js';
import { useStageStore } from '../../store/stageStore.js';
import {
  heightAboveStage,
  PROP_MAX_HEIGHT_ABOVE_STAGE,
  rotationDisplayDegrees,
} from '../../utils/propPosition.js';
import { DimensionControl } from './DimensionControl.jsx';
import { PositionNumberInput } from './PositionNumberInput.jsx';

export function SelectedPanel() {
  const stage = useStageStore((s) => s.stage);
  const props = useStageStore((s) => s.props);
  const selectedPropId = useStageStore((s) => s.selectedPropId);
  const positioningMode = useStageStore((s) => s.positioningMode);
  const selectProp = useStageStore((s) => s.selectProp);
  const togglePositioningMode = useStageStore((s) => s.togglePositioningMode);
  const rotateSelected = useStageStore((s) => s.rotateSelected);
  const setSelectedPropPosition = useStageStore((s) => s.setSelectedPropPosition);
  const deleteSelectedProp = useStageStore((s) => s.deleteSelectedProp);
  const setSelectedPropScale = useStageStore((s) => s.setSelectedPropScale);
  const togglePropVisibility = useStageStore((s) => s.togglePropVisibility);
  const setSelectedPropTag = useStageStore((s) => s.setSelectedPropTag);
  const copySelectedProp = useStageStore((s) => s.copySelectedProp);
  const setStageCurtainHeight = useStageStore((s) => s.setStageCurtainHeight);

  const selectedProp = props.find((p) => p.id === selectedPropId);
  const open = Boolean(selectedProp);
  const baseDims = selectedProp ? getPropCatalogSpec(selectedProp.type) : null;
  const isStageCurtain = selectedProp?.type === 'stage_curtain';
  const isDancer = selectedProp?.type === 'dancer';
  const stageCurtainHeight =
    selectedProp?.interactionState?.curtainHeight ??
    STAGE_CURTAIN_HEIGHT_LIMITS.default;
  const displayDims = baseDims && selectedProp
    ? isStageCurtain
      ? {
        width: stage.width.toFixed(2),
        height: stageCurtainHeight.toFixed(2),
        depth: baseDims.depth.toFixed(2),
      }
      : {
        width: (baseDims.width * selectedProp.scale).toFixed(2),
        height: (baseDims.height * selectedProp.scale).toFixed(2),
        depth: (baseDims.depth * selectedProp.scale).toFixed(2),
      }
    : null;
  const typeLabel =
    selectedProp && PROP_CATALOG.find((p) => p.type === selectedProp.type)?.label;
  const curtainLockText = selectedProp
    ? `X ${selectedProp.position[0].toFixed(2)} · Z ${selectedProp.position[2].toFixed(2)} · Rot ${rotationDisplayDegrees(selectedProp.rotation).toFixed(0)}°`
    : '';
  const shellRef = useRef(null);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, left: 0, bottom: 0 });

  const handleDancerPanelDragStart = useCallback((event) => {
    if (!shellRef.current || !isDancer) return;
    draggingRef.current = true;
    const computedStyle = window.getComputedStyle(shellRef.current);
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: Number.parseFloat(computedStyle.left) || 0,
      bottom: Number.parseFloat(computedStyle.bottom) || 0,
    };
    shellRef.current.style.transition = 'none';
    event.preventDefault();
  }, [isDancer]);

  useEffect(() => {
    const handleMove = (event) => {
      if (!draggingRef.current || !shellRef.current) return;
      const rect = shellRef.current.getBoundingClientRect();
      const maxLeft = Math.max(0, window.innerWidth - rect.width);
      const maxBottom = Math.max(0, window.innerHeight - rect.height);
      const left = dragStartRef.current.left + event.clientX - dragStartRef.current.x;
      const bottom = dragStartRef.current.bottom + dragStartRef.current.y - event.clientY;
      shellRef.current.style.left = `${Math.max(0, Math.min(maxLeft, left))}px`;
      shellRef.current.style.bottom = `${Math.max(0, Math.min(maxBottom, bottom))}px`;
    };
    const handleUp = () => {
      draggingRef.current = false;
      if (shellRef.current) shellRef.current.style.transition = '';
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, []);

  useEffect(() => {
    if (!open || !isDancer) {
      draggingRef.current = false;
      if (shellRef.current) {
        shellRef.current.style.left = '';
        shellRef.current.style.bottom = '';
        shellRef.current.style.transition = '';
      }
    }
  }, [isDancer, open]);

  return (
    <div
      ref={shellRef}
      className={[
        'selected-panel-shell',
        open ? 'selected-panel-shell--open' : '',
        isDancer ? 'selected-panel--dancer' : '',
      ].filter(Boolean).join(' ')}
      aria-hidden={!open}
    >
      <div className="selected-panel">
        {isDancer && (
          <div
            className="selected-panel-drag-handle"
            onPointerDown={handleDancerPanelDragStart}
            title="Drag panel"
          />
        )}
        {selectedProp && (
          <>
            <div className="selected-panel-header">
              <div className="selected-panel-header-main">
                <div className="selected-panel-title-row">
                  <h2 className="selected-panel-title">Selected</h2>
                  <label className="selected-panel-tag">
                    <span className="selected-panel-tag-label">Tag</span>
                    <input type="text" placeholder="Label" value={selectedProp.tag}
                      maxLength={PROP_TAG_MAX_LENGTH}
                      onChange={(e) => setSelectedPropTag(e.target.value)} />
                  </label>
                </div>
                <div className="selected-panel-meta">
                  {typeLabel && <p className="selected-panel-subtitle">{typeLabel}</p>}
                  {displayDims && (
                    <span className="selected-panel-dims-badge">
                      {displayDims.width}×{displayDims.height}×{displayDims.depth} m
                    </span>
                  )}
                  {isStageCurtain && (
                    <span className="selected-panel-lock-badge">Locked</span>
                  )}
                </div>
              </div>
              <div className="selected-panel-actions">
                {!isStageCurtain && (
                  <>
                    <button type="button" className={`btn btn-compact ${positioningMode ? 'active' : 'secondary'}`}
                      onClick={() => togglePositioningMode()}>Positioning</button>
                    <button type="button" className="btn btn-compact secondary"
                      onClick={() => copySelectedProp()} title="⌘C">Copy</button>
                  </>
                )}
                <button type="button" className="btn btn-compact secondary"
                  onClick={() => selectProp(null)}>Deselect</button>
              </div>
            </div>
            <div className="selected-panel-body">
              <section className="selected-panel-section">
                <span className="selected-panel-section-title">Position</span>
                {isStageCurtain ? (
                  <div className="stage-curtain-lock-card">
                    <span className="stage-curtain-lock-icon" aria-hidden>⌖</span>
                    <div>
                      <strong>Downstage line</strong>
                      <span>{curtainLockText}</span>
                    </div>
                  </div>
                ) : (
                  <div className="selected-panel-position-row">
                    <PositionNumberInput label="X" value={selectedProp.position[0]}
                      onCommit={(x) => setSelectedPropPosition(x, selectedProp.position[2], undefined, { finePosition: true })} />
                    <PositionNumberInput label="Z" value={selectedProp.position[2]}
                      onCommit={(z) => setSelectedPropPosition(selectedProp.position[0], z, undefined, { finePosition: true })} />
                    <PositionNumberInput label="Y" value={heightAboveStage(selectedProp.position[1], stage.height)}
                      min={0} max={PROP_MAX_HEIGHT_ABOVE_STAGE}
                      onCommit={(yUp) => setSelectedPropPosition(selectedProp.position[0], selectedProp.position[2], stage.height + yUp, { finePosition: true })} />
                    <div className="position-rot">
                      <span>Rot</span>
                      <strong>{rotationDisplayDegrees(selectedProp.rotation).toFixed(0)}°</strong>
                    </div>
                    <div className="position-rotate-btns">
                      <button type="button" className="btn btn-compact secondary"
                        onClick={() => rotateSelected(-Math.PI / 4)}>−45°</button>
                      <button type="button" className="btn btn-compact secondary"
                        onClick={() => rotateSelected(Math.PI / 4)}>+45°</button>
                    </div>
                  </div>
                )}
              </section>
              <section className="selected-panel-section selected-panel-size-row">
                <span className="selected-panel-section-title">
                  {isStageCurtain ? 'Curtain' : 'Size'}
                </span>
                {isStageCurtain ? (
                  <DimensionControl slim label="Curtain height" value={stageCurtainHeight}
                    min={STAGE_CURTAIN_HEIGHT_LIMITS.min}
                    max={STAGE_CURTAIN_HEIGHT_LIMITS.max}
                    step={0.5} inputStep={0.1} unit="m"
                    onChange={(v) => setStageCurtainHeight(selectedProp.id, v)} />
                ) : (
                  <DimensionControl slim label="Size" value={selectedProp.scale}
                    min={PROP_SCALE_LIMITS.min} max={PROP_SCALE_LIMITS.max}
                    step={PROP_SCALE_LIMITS.step} unit="×"
                    onChange={(v) => setSelectedPropScale(v)} />
                )}
              </section>
              <div className="selected-panel-footer-row">
                <button type="button" className="btn btn-compact secondary"
                  onClick={() => togglePropVisibility()}>
                  {selectedProp.visible ? 'Hide' : 'Show'}
                </button>
                <button type="button" className="btn btn-compact danger"
                  onClick={() => deleteSelectedProp()}>Delete</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
