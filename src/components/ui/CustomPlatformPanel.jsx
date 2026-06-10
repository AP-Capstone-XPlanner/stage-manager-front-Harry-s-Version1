import { CUSTOM_PLATFORM_LIMITS } from '../../utils/customPlatforms.js';
import { useStageStore } from '../../store/stageStore.js';
import { DimensionControl } from './DimensionControl.jsx';
import { PositionNumberInput } from './PositionNumberInput.jsx';

export function CustomPlatformPanel() {
  const stageShapePoints = useStageStore((s) => s.stageShapePoints);
  const stageShapeEditing = useStageStore((s) => s.stageShapeEditing);
  const stageShapeDrawMode = useStageStore((s) => s.stageShapeDrawMode);
  const stageShapeDraftPoints = useStageStore((s) => s.stageShapeDraftPoints);
  const selectedStageShapePointIndex = useStageStore(
    (s) => s.selectedStageShapePointIndex,
  );
  const platforms = useStageStore((s) => s.customPlatforms);
  const selectedPlatformId = useStageStore((s) => s.selectedPlatformId);
  const selectedPlatformPointIndex = useStageStore((s) => s.selectedPlatformPointIndex);
  const toggleStageShapeEditing = useStageStore((s) => s.toggleStageShapeEditing);
  const moveStageShapePoint = useStageStore((s) => s.moveStageShapePoint);
  const addStageShapePoint = useStageStore((s) => s.addStageShapePoint);
  const removeSelectedStageShapePoint = useStageStore(
    (s) => s.removeSelectedStageShapePoint,
  );
  const resetStageShapePoints = useStageStore((s) => s.resetStageShapePoints);
  const applyStageShapePreset = useStageStore((s) => s.applyStageShapePreset);
  const startStageShapeDrawing = useStageStore((s) => s.startStageShapeDrawing);
  const finishStageShapeDrawing = useStageStore((s) => s.finishStageShapeDrawing);
  const cancelStageShapeDrawing = useStageStore((s) => s.cancelStageShapeDrawing);
  const undoStageShapeDrawPoint = useStageStore((s) => s.undoStageShapeDrawPoint);
  const addCustomPlatform = useStageStore((s) => s.addCustomPlatform);
  const updateCustomPlatform = useStageStore((s) => s.updateCustomPlatform);
  const removeCustomPlatform = useStageStore((s) => s.removeCustomPlatform);
  const selectCustomPlatform = useStageStore((s) => s.selectCustomPlatform);
  const moveCustomPlatformPoint = useStageStore((s) => s.moveCustomPlatformPoint);
  const addCustomPlatformPoint = useStageStore((s) => s.addCustomPlatformPoint);
  const removeSelectedCustomPlatformPoint = useStageStore(
    (s) => s.removeSelectedCustomPlatformPoint,
  );

  const selectedPlatform = platforms.find((platform) => platform.id === selectedPlatformId);
  const selectedPoint =
    selectedPlatform && selectedPlatformPointIndex !== null
      ? selectedPlatform.points[selectedPlatformPointIndex]
      : null;
  const selectedStagePoint =
    selectedStageShapePointIndex !== null
      ? stageShapePoints[selectedStageShapePointIndex]
      : null;
  const canDeleteStagePoint =
    Boolean(selectedStagePoint) &&
    stageShapePoints.length > CUSTOM_PLATFORM_LIMITS.minPoints;
  const canDeletePoint =
    Boolean(selectedPoint) &&
    selectedPlatform.points.length > CUSTOM_PLATFORM_LIMITS.minPoints;
  const workspaceLimit = CUSTOM_PLATFORM_LIMITS.workspaceHalfExtent;
  const canFinishDraw = stageShapeDraftPoints.length >= CUSTOM_PLATFORM_LIMITS.minPoints;

  const updateSelectedPoint = (nextX, nextZ) => {
    if (!selectedPlatform || selectedPlatformPointIndex === null) return;
    moveCustomPlatformPoint(
      selectedPlatform.id,
      selectedPlatformPointIndex,
      nextX,
      nextZ,
      { snap: false },
    );
  };

  const updateSelectedStagePoint = (nextX, nextZ) => {
    if (selectedStageShapePointIndex === null) return;
    moveStageShapePoint(selectedStageShapePointIndex, nextX, nextZ, { snap: false });
  };

  return (
    <section className="panel platform-panel">
      <div className="panel-title-row">
        <h2>Platforms</h2>
        {platforms.length > 0 && <span className="panel-count">{platforms.length}</span>}
      </div>

      <div className="main-platform-editor">
        <div className="main-platform-heading">
          <div>
            <strong>Main stage deck</strong>
            <span>{stageShapePoints.length} outline points</span>
          </div>
          <button
            type="button"
            className={`btn btn-compact ${stageShapeEditing ? 'active' : 'secondary'}`}
            onClick={toggleStageShapeEditing}
          >
            {stageShapeEditing ? 'Editing' : 'Edit'}
          </button>
        </div>

        {stageShapeEditing && (
          <>
            <div className="btn-row platform-point-actions">
              <button
                type="button"
                className="btn btn-compact secondary"
                disabled={stageShapePoints.length >= CUSTOM_PLATFORM_LIMITS.maxPoints}
                onClick={addStageShapePoint}
              >
                Add stage point
              </button>
              <button
                type="button"
                className="btn btn-compact secondary"
                disabled={!canDeleteStagePoint}
                onClick={removeSelectedStageShapePoint}
              >
                Delete point
              </button>
            </div>
            <button
              type="button"
              className="btn btn-compact secondary platform-reset-btn"
              onClick={resetStageShapePoints}
            >
              Reset rectangle
            </button>
            <div className="stage-shape-preset-grid">
              <button
                type="button"
                className="btn btn-compact secondary"
                onClick={() => applyStageShapePreset('rectangle')}
              >
                Rectangle
              </button>
              <button
                type="button"
                className="btn btn-compact secondary"
                onClick={() => applyStageShapePreset('circle')}
              >
                Circle
              </button>
              <button
                type="button"
                className="btn btn-compact secondary"
                onClick={() => applyStageShapePreset('semicircle')}
              >
                Semi circle
              </button>
              <button
                type="button"
                className="btn btn-compact secondary"
                onClick={() => applyStageShapePreset('ellipse')}
              >
                Ellipse
              </button>
            </div>
            <div className="stage-draw-controls">
              {!stageShapeDrawMode ? (
                <button
                  type="button"
                  className="btn btn-compact secondary"
                  onClick={startStageShapeDrawing}
                >
                  Draw perimeter
                </button>
              ) : (
                <>
                  <span className="stage-draw-count">
                    {stageShapeDraftPoints.length} pts
                  </span>
                  <button
                    type="button"
                    className="btn btn-compact secondary"
                    disabled={!canFinishDraw}
                    onClick={finishStageShapeDrawing}
                  >
                    Finish
                  </button>
                  <button
                    type="button"
                    className="btn btn-compact secondary"
                    disabled={stageShapeDraftPoints.length === 0}
                    onClick={undoStageShapeDrawPoint}
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    className="btn btn-compact secondary"
                    onClick={cancelStageShapeDrawing}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
            {selectedStagePoint && (
              <div className="platform-point-fields">
                <span className="platform-point-title">
                  Stage point {selectedStageShapePointIndex + 1}
                </span>
                <div className="selected-panel-position-row">
                  <PositionNumberInput
                    label="X"
                    value={selectedStagePoint[0]}
                    min={-workspaceLimit}
                    max={workspaceLimit}
                    onCommit={(x) => updateSelectedStagePoint(x, selectedStagePoint[1])}
                  />
                  <PositionNumberInput
                    label="Z"
                    value={selectedStagePoint[1]}
                    min={-workspaceLimit}
                    max={workspaceLimit}
                    onCommit={(z) => updateSelectedStagePoint(selectedStagePoint[0], z)}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="btn-row platform-create-row">
        <button type="button" className="btn secondary" onClick={() => addCustomPlatform('platform')}>
          New platform
        </button>
        <button type="button" className="btn secondary" onClick={() => addCustomPlatform('ground')}>
          New ground
        </button>
      </div>

      {platforms.length > 0 ? (
        <div className="platform-list">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              type="button"
              className={`platform-list-item ${platform.id === selectedPlatformId ? 'active' : ''}`}
              onClick={() => selectCustomPlatform(platform.id)}
            >
              <span className="platform-color-dot" style={{ background: platform.color }} />
              <span className="platform-list-name">{platform.name}</span>
              <span className="platform-list-meta">{platform.points.length} pts</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="platform-empty-state">No custom platforms</p>
      )}

      {selectedPlatform && (
        <div className="platform-editor">
          <label className="platform-name-field">
            <span>Name</span>
            <input
              type="text"
              value={selectedPlatform.name}
              maxLength={36}
              onChange={(event) =>
                updateCustomPlatform(selectedPlatform.id, { name: event.target.value })
              }
            />
          </label>

          <label className="platform-color-field">
            <span>Color</span>
            <input
              type="color"
              value={selectedPlatform.color}
              onChange={(event) =>
                updateCustomPlatform(selectedPlatform.id, { color: event.target.value })
              }
            />
          </label>

          <DimensionControl
            label="Height"
            value={selectedPlatform.height}
            min={CUSTOM_PLATFORM_LIMITS.minHeight}
            max={CUSTOM_PLATFORM_LIMITS.maxHeight}
            step={0.05}
            inputStep={0.01}
            unit="m"
            slim
            onChange={(height) =>
              updateCustomPlatform(selectedPlatform.id, { height })
            }
          />

          <div className="btn-row platform-point-actions">
            <button
              type="button"
              className="btn btn-compact secondary"
              disabled={selectedPlatform.points.length >= CUSTOM_PLATFORM_LIMITS.maxPoints}
              onClick={() => addCustomPlatformPoint(selectedPlatform.id)}
            >
              Add point
            </button>
            <button
              type="button"
              className="btn btn-compact secondary"
              disabled={!canDeletePoint}
              onClick={removeSelectedCustomPlatformPoint}
            >
              Delete point
            </button>
          </div>

          {selectedPoint && (
            <div className="platform-point-fields">
              <span className="platform-point-title">
                Point {selectedPlatformPointIndex + 1}
              </span>
              <div className="selected-panel-position-row">
                <PositionNumberInput
                  label="X"
                  value={selectedPoint[0]}
                  min={-workspaceLimit}
                  max={workspaceLimit}
                  onCommit={(x) => updateSelectedPoint(x, selectedPoint[1])}
                />
                <PositionNumberInput
                  label="Z"
                  value={selectedPoint[1]}
                  min={-workspaceLimit}
                  max={workspaceLimit}
                  onCommit={(z) => updateSelectedPoint(selectedPoint[0], z)}
                />
              </div>
            </div>
          )}

          <div className="btn-row platform-danger-row">
            <button
              type="button"
              className="btn btn-compact danger"
              onClick={() => removeCustomPlatform(selectedPlatform.id)}
            >
              Delete platform
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
