import { Alert, FormControlLabel, Switch, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { ApiError } from "../api/apiClient";
import { deletePushSubscription, getPushPublicKey, savePushSubscription } from "../api/notificationsApi";
import { describeError } from "../errorMessages";
import { texts } from "../translations/cs";

const isSupported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

function decodeBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const padded = text
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(text.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

export function NotificationsSection() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupported) {
      return;
    }
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setIsSubscribed(subscription !== null))
      .catch(() => setIsSubscribed(false));
  }, []);

  async function subscribe() {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setErrorMessage(texts.notifications.denied);
      return;
    }
    const { publicKey } = await getPushPublicKey();
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeBase64Url(publicKey),
    });
    await savePushSubscription(subscription.toJSON());
    setIsSubscribed(true);
  }

  async function unsubscribe() {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await deletePushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
    }
    setIsSubscribed(false);
  }

  async function toggle(enabled: boolean) {
    setErrorMessage(null);
    setIsBusy(true);
    try {
      await (enabled ? subscribe() : unsubscribe());
    } catch (error) {
      if (error instanceof ApiError && error.status === 503) {
        setErrorMessage(texts.notifications.notConfigured);
      } else if (error instanceof DOMException) {
        setErrorMessage(texts.notifications.subscribeFailed);
      } else {
        setErrorMessage(describeError(error));
      }
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="section">
      <Typography variant="h6" component="h2">
        {texts.notifications.title}
      </Typography>
      {isSupported ? (
        <>
          <FormControlLabel
            control={
              <Switch
                checked={isSubscribed}
                disabled={isBusy}
                onChange={(event) => toggle(event.target.checked)}
              />
            }
            label={texts.notifications.expirationSwitch}
          />
          <Typography variant="body2" color="text.secondary">
            {texts.notifications.description}
          </Typography>
        </>
      ) : (
        <Typography color="text.secondary">{texts.notifications.unsupported}</Typography>
      )}
      {errorMessage && <Alert severity="warning">{errorMessage}</Alert>}
    </section>
  );
}
