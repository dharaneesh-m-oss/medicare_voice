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

type Mode = 'idle' | 'camera' | 'preview' | 'analyzing';

const STAGE_ORDER: ScanStage[] = ['recognising', 'reading_text', 'checking_expiry', 'verifying'];
const STAGE_KEYS: Record<ScanStage, TranslationKey> = {
  recognising: 'scan.stage.recognising',
  reading_text: 'scan.stage.reading_text',
  checking_expiry: 'scan.stage.checking_expiry',
  verifying: 'scan.stage.verifying',
  done: 'scan.analyzing',
};

/**
 * Laid out like a camera app: the viewfinder IS the screen, the shutter is the
 * one unmissable control, and everything else floats over the frame on glass.
 */
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
      await new Promise((r) => requestAnimationFrame(r));
      if (!videoRef.current) throw new Error('no_video_element');
      await cameraRef.current.start(videoRef.current, { facingMode: 'environment' });
    } catch (err) {
      setError(
        String(err).includes('camera_unsupported')
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

  const currentIndex = STAGE_ORDER.indexOf(stage);

  /* The shutter changes job with the mode, so there is only ever one big
     button on screen and it always does the obvious next thing. */
  const shutter = () => {
    if (mode === 'idle') return void openCamera();
    if (mode === 'camera') return capture();
    if (mode === 'preview') return void analyze(image, samplePackId);
  };

  const shutterLabel =
    mode === 'idle'
      ? t('scan.open_camera')
      : mode === 'camera'
        ? t('scan.capture')
        : mode === 'preview'
          ? t('scan.analyze')
          : t('scan.analyzing');

  return (
    <Screen title={t('scan.title')}>
      <div className="scanner">
        <div className="scanner-stage">
          {mode === 'camera' && <video ref={videoRef} muted playsInline />}
          {(mode === 'preview' || mode === 'analyzing') && image && (
            <img src={image} alt={t('scan.preview_title')} />
          )}

          {mode === 'idle' && (
            <div className="scanner-placeholder">
              <Icon name="camera" size={54} strokeWidth={1.5} />
              <span>{t('scan.instruction')}</span>
            </div>
          )}

          {(mode === 'camera' || mode === 'preview') && (
            <div className="scanner-frame" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          )}

          {engine.isSimulated && mode !== 'analyzing' && (
            <div className="scanner-chip">
              <Icon name="alert" size={18} />
              <span>{t('scan.engine_banner')}</span>
            </div>
          )}

          {mode === 'analyzing' && (
            <>
              <div className="scanner-scanline" aria-hidden="true" />
              <div className="scanner-progress" role="status">
                {STAGE_ORDER.map((s) => {
                  const index = STAGE_ORDER.indexOf(s);
                  const state =
                    stage === 'done' || index < currentIndex
                      ? 'done'
                      : index === currentIndex
                        ? 'active'
                        : 'todo';
                  return (
                    <span className="scanner-step" data-state={state} key={s}>
                      <i />
                      {t(STAGE_KEYS[s])}
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="scanner-controls">
          {/* Gallery */}
          <label className="scanner-side" aria-label={t('scan.upload')}>
            <Icon name="clipboard" size={24} />
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </label>

          <button
            type="button"
            className="shutter"
            onClick={shutter}
            disabled={mode === 'analyzing'}
            aria-label={shutterLabel}
          >
            <Icon
              name={mode === 'preview' ? 'shield' : 'camera'}
              size={34}
              strokeWidth={2}
            />
          </button>

          {/* Sample packs */}
          <button
            type="button"
            className="scanner-side"
            aria-label={t('scan.use_sample')}
            aria-pressed={showSamples}
            onClick={() => setShowSamples((v) => !v)}
          >
            <Icon name="pills" size={24} />
          </button>
        </div>

        <span className="shutter-label">{shutterLabel}</span>

        {mode === 'preview' && (
          <button type="button" className="btn btn-ghost" onClick={retake}>
            {t('scan.retake')}
          </button>
        )}

        {showSamples && mode !== 'analyzing' && (
          <>
            <span className="shutter-label">{t('scan.sample_hint')}</span>
            <div className="sample-rail">
              {SAMPLE_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  className="sample-tile"
                  onClick={() => pickSample(pack.id)}
                >
                  <span className="sample-dot" style={{ background: pack.color }}>
                    {pack.medicineName.slice(0, 2).toUpperCase()}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.88em', lineHeight: 1.2 }}>
                    {pack.medicineName}
                    {pack.strength ? ` ${pack.strength.value} ${pack.strength.unit}` : ''}
                  </span>
                  <span style={{ fontSize: '0.72em', opacity: 0.75 }}>
                    {t(`form.${pack.dosageForm}` as TranslationKey)}
                  </span>
                  <span style={{ fontSize: '0.72em', opacity: 0.75 }}>
                    {t('result.expiry')}: {expiryToPrinted(resolveExpiry(pack))}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        <p className="footnote">{t('safety.disclaimer')}</p>
      </div>
    </Screen>
  );
}
