import { useCallback, useEffect, useRef, useState } from 'react';

import { useApp } from '../../app/AppState';
import { useNavigator } from '../../app/Navigator';
import { CameraService, fileToDataUrl } from '../../core/camera/CameraService';
import { runScan, type ScanStage } from '../../core/pipeline/ScanPipeline';
import {
  SAMPLE_PACKS,
  findPack,
  getRecognitionEngine,
  renderPackImage,
  resolveExpiry,
} from '../../core/recognition';
import type { TranslationKey } from '../../core/i18n';
import { expiryToPrinted } from '../../core/utils/date';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { SafetyNote } from '../components/common';

type Mode = 'idle' | 'camera' | 'preview' | 'analyzing';

const STAGE_ORDER: ScanStage[] = ['recognising', 'reading_text', 'checking_expiry', 'verifying'];
const STAGE_KEYS: Record<ScanStage, TranslationKey> = {
  recognising: 'scan.stage.recognising',
  reading_text: 'scan.stage.reading_text',
  checking_expiry: 'scan.stage.checking_expiry',
  verifying: 'scan.stage.verifying',
  done: 'scan.analyzing',
};

export function ScanScreen() {
  const { t, schedules, records, addScan } = useApp();
  const { replace, params } = useNavigator();

  const [mode, setMode] = useState<Mode>('idle');
  const [image, setImage] = useState<string | null>(null);
  const [samplePackId, setSamplePackId] = useState<string | null>(null);
  const [showSamples, setShowSamples] = useState(Boolean(params.openSamples));
  const [stage, setStage] = useState<ScanStage>('recognising');
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<CameraService>(new CameraService());
  const autoRun = useRef(false);

  const engine = getRecognitionEngine();

  useEffect(() => {
    const camera = cameraRef.current;
    return () => camera.stop();
  }, []);

  const analyze = useCallback(
    async (dataUrl: string | null, packId: string | null) => {
      setMode('analyzing');
      setStage('recognising');
      try {
        const scan = await runScan({
          imageDataUrl: dataUrl,
          samplePackId: packId,
          schedules,
          records,
          onStage: (s) => setStage(s),
        });
        addScan(scan);
        replace('result');
      } catch (err) {
        console.error('[scan] pipeline failed', err);
        setError(String(err));
        setMode('preview');
      }
    },
    [schedules, records, addScan, replace],
  );

  /* Demo Mode can request a scan of one specific pack. */
  useEffect(() => {
    if (autoRun.current || !params.autoSamplePackId) return;
    const pack = findPack(params.autoSamplePackId);
    if (!pack) return;
    autoRun.current = true;
    const rendered = renderPackImage(pack);
    setImage(rendered);
    setSamplePackId(pack.id);
    void analyze(rendered, pack.id);
  }, [params.autoSamplePackId, analyze]);

  const openCamera = async () => {
    setError(null);
    setMode('camera');
    try {
      // wait a frame so the <video> element exists
      await new Promise((r) => requestAnimationFrame(r));
      if (!videoRef.current) throw new Error('no_video_element');
      await cameraRef.current.start(videoRef.current, { facingMode: 'environment' });
    } catch (err) {
      const message = String(err);
      setError(
        message.includes('camera_unsupported')
          ? t('scan.camera_unsupported')
          : t('scan.camera_denied'),
      );
      setMode('idle');
      setShowSamples(true);
    }
  };

  const capture = () => {
    if (!videoRef.current) return;
    try {
      const dataUrl = cameraRef.current.capture(videoRef.current);
      cameraRef.current.stop();
      setImage(dataUrl);
      setSamplePackId(null);
      setMode('preview');
    } catch (err) {
      setError(String(err));
    }
  };

  const pickSample = (packId: string) => {
    const pack = findPack(packId);
    if (!pack) return;
    cameraRef.current.stop();
    setImage(renderPackImage(pack));
    setSamplePackId(pack.id);
    setShowSamples(false);
    setMode('preview');
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    cameraRef.current.stop();
    setImage(await fileToDataUrl(file));
    setSamplePackId(null);
    setMode('preview');
  };

  const retake = () => {
    setImage(null);
    setSamplePackId(null);
    setMode('idle');
  };

  return (
    <Screen title={t('scan.title')}>
      {engine.isSimulated && (
        <div className="banner">
          <Icon name="alert" size={22} />
          <span>
            <strong>{engine.displayName}</strong>
            <br />
            {t('scan.engine_banner')}
          </span>
        </div>
      )}

      <div className="viewfinder">
        {mode === 'camera' && (
          <>
            <video ref={videoRef} muted playsInline />
            <div className="viewfinder-guide" />
          </>
        )}
        {(mode === 'preview' || mode === 'analyzing') && image && (
          <img src={image} alt={t('scan.preview_title')} />
        )}
        {mode === 'idle' && (
          <div className="viewfinder-placeholder">
            <Icon name="camera" size={56} strokeWidth={1.6} />
            <p>{t('scan.instruction')}</p>
          </div>
        )}
      </div>

      {error && <div className="banner banner-warn">{error}</div>}

      {mode === 'idle' && (
        <>
          <button type="button" className="btn btn-lg btn-primary" onClick={openCamera}>
            <Icon name="camera" size={30} />
            {t('scan.open_camera')}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowSamples((v) => !v)}
          >
            {t('scan.use_sample')}
          </button>
          <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
            {t('scan.upload')}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </label>
        </>
      )}

      {mode === 'camera' && (
        <>
          <button type="button" className="btn btn-lg btn-primary" onClick={capture}>
            <Icon name="camera" size={30} />
            {t('scan.capture')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={retake}>
            {t('common.cancel')}
          </button>
        </>
      )}

      {mode === 'preview' && (
        <>
          <button
            type="button"
            className="btn btn-lg btn-primary"
            onClick={() => void analyze(image, samplePackId)}
          >
            <Icon name="shield" size={28} />
            {t('scan.analyze')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={retake}>
            {t('scan.retake')}
          </button>
        </>
      )}

      {mode === 'analyzing' && (
        <div className="card">
          <h2>{t('scan.analyzing')}</h2>
          <div className="stages">
            {STAGE_ORDER.map((s) => {
              const currentIndex = STAGE_ORDER.indexOf(stage);
              const index = STAGE_ORDER.indexOf(s);
              const done = stage === 'done' || index < currentIndex;
              const active = index === currentIndex && stage !== 'done';
              return (
                <div
                  key={s}
                  className={`stage${active ? ' stage-active' : ''}${done ? ' stage-done' : ''}`}
                >
                  <span className="stage-dot" />
                  {t(STAGE_KEYS[s])}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showSamples && mode !== 'analyzing' && (
        <div className="stack">
          <h2 className="section-title">{t('scan.sample_title')}</h2>
          <p className="muted">{t('scan.sample_hint')}</p>
          <div className="sample-grid">
            {SAMPLE_PACKS.map((pack) => (
              <button
                key={pack.id}
                type="button"
                className="sample"
                onClick={() => pickSample(pack.id)}
              >
                <span className="sample-swatch" style={{ background: pack.color }} />
                <span className="sample-name">
                  {pack.medicineName}
                  {pack.strength ? ` ${pack.strength.value} ${pack.strength.unit}` : ''}
                </span>
                <span className="sample-meta">{t(`form.${pack.dosageForm}` as TranslationKey)}</span>
                <span className="sample-meta">
                  {t('result.expiry')}: {expiryToPrinted(resolveExpiry(pack))}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <SafetyNote />
    </Screen>
  );
}
