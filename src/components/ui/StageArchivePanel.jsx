import { useCallback, useEffect, useState } from 'react';
import { useStageStore } from '../../store/stageStore.js';

const DEFAULT_STAGE_API_URL = 'http://localhost:8080/api/stage';
const BACKEND_URL = (
  import.meta.env.VITE_STAGE_API_URL ??
  import.meta.env.VITE_BACKEND_URL ??
  DEFAULT_STAGE_API_URL
).replace(/\/+$/, '');

function hasChoreographyContent(choreographyData) {
  if (!choreographyData) return false;
  return [
    choreographyData.formations,
    choreographyData.savedPaths,
    choreographyData.stationaryMarkers,
  ].some((items) => Array.isArray(items) && items.length > 0) ||
    Boolean(choreographyData.musicDuration);
}

function hasStageShapeContent(stageData) {
  return Array.isArray(stageData?.stageShapePoints) && stageData.stageShapePoints.length > 0;
}

function hasSnapshotContent(snapshot) {
  return (
    (Array.isArray(snapshot.propsData) && snapshot.propsData.length > 0) ||
    (Array.isArray(snapshot.platformData?.platforms) &&
      snapshot.platformData.platforms.length > 0) ||
    hasStageShapeContent(snapshot.stageData) ||
    hasChoreographyContent(snapshot.choreographyData)
  );
}

export function StageArchivePanel() {
  const getStageArchiveSnapshot = useStageStore((s) => s.getStageArchiveSnapshot);
  const loadStageArchiveSnapshot = useStageStore((s) => s.loadStageArchiveSnapshot);
  const [archiveList, setArchiveList] = useState([]);
  const [selectedArchive, setSelectedArchive] = useState('');
  const [archiveStatus, setArchiveStatus] = useState('');
  const [busyAction, setBusyAction] = useState('');

  const refreshArchiveList = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/list`);
      if (!response.ok) throw new Error('Archive list request failed');
      const data = await response.json();
      setArchiveList(Array.isArray(data) ? data : []);
      setArchiveStatus('');
    } catch (error) {
      console.error('Unable to reach Java stage archive backend', error);
      setArchiveList([]);
      setArchiveStatus('Java backend offline');
    }
  }, []);

  useEffect(() => {
    refreshArchiveList();
  }, [refreshArchiveList]);

  const handleSaveStage = async () => {
    const snapshot = getStageArchiveSnapshot();
    if (!hasSnapshotContent(snapshot)) {
      window.alert('Add a prop, platform, stage shape edit, or choreography item before saving a stage snapshot.');
      return;
    }

    const sceneName = window.prompt(
      'Name this stage snapshot:',
      'My 3D Stage',
    );
    if (!sceneName) return;

    setBusyAction('save');
    try {
      const response = await fetch(`${BACKEND_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneName, ...snapshot }),
      });
      if (!response.ok) throw new Error('Archive save failed');
      window.alert(`Saved stage snapshot: ${sceneName}`);
      await refreshArchiveList();
      setSelectedArchive(sceneName);
    } catch (error) {
      console.error('Stage archive save failed', error);
      window.alert('Save failed. Make sure the Java Spring Boot backend is running with CORS enabled.');
    } finally {
      setBusyAction('');
    }
  };

  const handleLoadStage = async () => {
    if (!selectedArchive) {
      window.alert('Select a stage snapshot first.');
      return;
    }

    setBusyAction('load');
    try {
      const response = await fetch(
        `${BACKEND_URL}/load?name=${encodeURIComponent(selectedArchive)}`,
      );
      if (!response.ok) throw new Error('Archive load failed');
      const data = await response.json();
      const loaded = loadStageArchiveSnapshot(data);
      if (!loaded) throw new Error('Archive data was not a prop array or snapshot');
      window.alert(`Loaded stage snapshot: ${selectedArchive}`);
    } catch (error) {
      console.error('Stage archive load failed', error);
      window.alert('Load failed. The archive may be missing, damaged, or incompatible.');
    } finally {
      setBusyAction('');
    }
  };

  const handleDeleteArchive = async () => {
    if (!selectedArchive) {
      window.alert('Select a stage snapshot to delete.');
      return;
    }
    if (!window.confirm(`Delete "${selectedArchive}" from the server? This cannot be undone.`)) {
      return;
    }

    setBusyAction('delete');
    try {
      const response = await fetch(
        `${BACKEND_URL}/delete?name=${encodeURIComponent(selectedArchive)}`,
        { method: 'DELETE' },
      );
      if (!response.ok) throw new Error('Archive delete failed');
      window.alert(`Deleted stage snapshot: ${selectedArchive}`);
      setSelectedArchive('');
      await refreshArchiveList();
    } catch (error) {
      console.error('Stage archive delete failed', error);
      window.alert('Delete failed. The server reported an error.');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <section className="panel archive-panel">
      <div className="panel-title-row">
        <h2>Stage Archives</h2>
        <button type="button" className="archive-refresh-btn"
          onClick={refreshArchiveList} title="Refresh archives"
          aria-label="Refresh archives">
          ↻
        </button>
      </div>
      <button type="button" className="btn archive-save-btn"
        disabled={busyAction === 'save'}
        onClick={handleSaveStage}>
        Save snapshot
      </button>
      <div className="archive-load-row">
        <select className="archive-select" value={selectedArchive}
          onChange={(event) => setSelectedArchive(event.target.value)}>
          <option value="">Select snapshot</option>
          {archiveList.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <button type="button" className="btn btn-compact secondary archive-action-btn"
          disabled={!selectedArchive || busyAction === 'load'}
          onClick={handleLoadStage}>
          Load
        </button>
        <button type="button" className="btn btn-compact danger archive-action-btn"
          disabled={!selectedArchive || busyAction === 'delete'}
          onClick={handleDeleteArchive}>
          Delete
        </button>
      </div>
      {archiveStatus && <p className="archive-status">{archiveStatus}</p>}
    </section>
  );
}
