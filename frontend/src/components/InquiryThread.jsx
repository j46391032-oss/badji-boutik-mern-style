import { useEffect, useRef, useState } from 'react';
import { formatDateTime } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';

// Fil de discussion d'une demande (client ou administrateur)
export default function InquiryThread({ inquiry, viewer, onSend, disabled = false }) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const end = useRef(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [inquiry.messages.length, inquiry._id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await onSend(text.trim());
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="thread">
      <div className="messages">
        {inquiry.messages.map((m) => (
          <div key={m._id} className={`msg ${m.from === viewer ? 'mine' : 'theirs'}`}>
            <div className="bubble">{m.text}</div>
            <span className="muted small">{m.from === 'admin' ? t('Vendeur') : t('Client')} · {formatDateTime(m.createdAt)}</span>
          </div>
        ))}
        <div ref={end} />
      </div>
      {disabled ? (
        <p className="muted small">{t('Cette demande est clôturée.')}</p>
      ) : (
        <form className="reply" onSubmit={submit}>
          <textarea rows="2" maxLength="2000" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Écrire un message…')} aria-label={t('Message')} />
          <button className="btn btn-primary" disabled={sending || !text.trim()}>{t('Envoyer')}</button>
        </form>
      )}
    </div>
  );
}
