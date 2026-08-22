import { useState } from 'react';

import { useApp } from '../../app/AppState';
import { useNavigator } from '../../app/Navigator';
import type { TranslationKey } from '../../core/i18n';
import { formatStrength } from '../../core/types';
import { checkExpiry, namesMatch } from '../../core/verification/VerificationEngine';
import { expiryToPrinted } from '../../core/utils/date';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { Modal, SafetyNote, StatusBadge, type Tone } from '../components/common';

const TONE: Record<string, Tone> = {
  valid: 'success',
  expiring_soon: 'warn',
  expired: 'danger',
  unknown: 'info',
};

const LABEL: Record<string, TranslationKey> = {
  valid: 'result.status_valid',
  expiring_soon: 'result.status_expiring',
  expired: 'result.status_expired',
  unknown: 'result.status_unknown',
};

export function MyMedicinesScreen() {
  const { t, medicines, schedules, removeMedicine } = useApp();
  const { navigate } = useNavigator();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const pendingRemoval = medicines.find((m) => m.id === confirmId) ?? null;

  return (
    <Screen title={t('medicines.title')}>
      <button
        type="button"
        className="btn btn-lg btn-primary"
        onClick={() => navigate('add')}
      >
        <Icon name="plus" size={28} />
        {t('medicines.add')}
      </button>

      {medicines.length === 0 && <p className="empty">{t('medicines.empty')}</p>}

      {medicines.length > 0 && (
        <span className="muted">{t('medicines.count', { count: medicines.length })}</span>
      )}

      {medicines.map((medicine) => {
        const expiry = checkExpiry(medicine.expiry);
        const scheduled = schedules.some(
          (s) => s.active && namesMatch(s.medicineName, medicine.name),
        );
        return (
          <div className="card card-tight" key={medicine.id}>
            <div className="row">
              <span className="big-value">
                {medicine.name} {formatStrength(medicine.strength)}
              </span>
              <StatusBadge tone={TONE[expiry.status]}>{t(LABEL[expiry.status])}</StatusBadge>
            </div>
            <span className="muted">
              {t(`form.${medicine.form}` as TranslationKey)}
              {' · '}
              {medicine.expiry
                ? t('medicines.expiry', { date: expiryToPrinted(medicine.expiry) ?? '' })
                : t('medicines.no_expiry')}
            </span>
            <span className="muted">
              {scheduled ? t('medicines.scheduled') : t('medicines.not_scheduled')}
              {medicine.notes ? ` · ${medicine.notes}` : ''}
            </span>
            <button
              type="button"
              className="btn btn-danger"
              style={{ minHeight: 52 }}
              onClick={() => setConfirmId(medicine.id)}
            >
              {t('medicines.remove')}
            </button>
          </div>
        );
      })}

      <SafetyNote />

      {pendingRemoval && (
        <Modal title={t('medicines.remove')}>
          <p style={{ margin: 0 }}>
            {t('medicines.remove_confirm', {
              name: `${pendingRemoval.name} ${formatStrength(pendingRemoval.strength)}`,
            })}
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmId(null)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                removeMedicine(pendingRemoval.id);
                setConfirmId(null);
              }}
            >
              {t('common.delete')}
            </button>
          </div>
        </Modal>
      )}
    </Screen>
  );
}
