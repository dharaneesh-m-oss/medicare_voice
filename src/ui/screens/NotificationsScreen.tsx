import { useApp } from '../../app/AppState';
import { useNavigator, type ScreenName } from '../../app/Navigator';
import type { TranslationKey } from '../../core/i18n';
import type { FeedItem } from '../../core/notifications/types';
import { Icon, type IconName } from '../components/Icon';
import { Screen } from '../components/Screen';
import { EmptyState } from '../components/kit';

const KIND_ICON: Record<FeedItem['kind'], IconName> = {
  follow_up_due: 'calendar',
  appointment_request: 'clipboard',
  appointment_soon: 'calendar',
  appointment_confirmed: 'check',
  desk_message: 'hospital',
  medication_missed: 'pills',
  wellbeing: 'activity',
};

/**
 * One inbox for both sources: alerts derived from the data (always current) and
 * messages a person actually sent (persisted, and markable as read).
 */
export function NotificationsScreen() {
  const { t, locale, notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const { navigate } = useNavigator();

  const unread = notifications.filter((n) => !n.read && n.source === 'stored').length;

  const className = (item: FeedItem) => {
    const parts = ['notice'];
    if (item.severity === 'urgent') parts.push('notice-urgent');
    else if (item.severity === 'attention') parts.push('notice-attention');
    if (!item.read && item.source === 'stored') parts.push('notice-unread');
    return parts.join(' ');
  };

  return (
    <Screen title={t('notify.title')}>
      {unread > 0 && (
        <button type="button" className="btn btn-ghost" onClick={markAllNotificationsRead}>
          {t('notify.mark_all')}
        </button>
      )}

      {notifications.length === 0 && <EmptyState message={t('notify.none')} />}

      {notifications.map((item) => (
        <div className={className(item)} key={item.id}>
          <span className="insight-icon">
            <Icon name={KIND_ICON[item.kind] ?? 'clipboard'} size={22} />
          </span>
          <div className="notice-body">
            <span className="notice-title">
              {item.titleKey ? t(item.titleKey as TranslationKey, item.params) : item.title}
            </span>
            <span className="notice-text">
              {item.bodyKey ? t(item.bodyKey as TranslationKey, item.params) : item.body}
            </span>
            <span className="notice-meta">
              {new Date(item.createdAt).toLocaleString(locale)}
            </span>
            {item.actionScreen && (
              <button
                type="button"
                className="link-button"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => {
                  if (item.source === 'stored') markNotificationRead(item.id);
                  navigate(item.actionScreen as ScreenName, {
                    patientId: item.patientId,
                    appointmentId: item.appointmentId,
                  });
                }}
              >
                {t('common.view')} →
              </button>
            )}
          </div>
        </div>
      ))}
    </Screen>
  );
}
