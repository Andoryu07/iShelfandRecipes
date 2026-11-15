import { Alert, Button, FormControlLabel, Switch, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { ApiError } from "../api/apiClient";
import {
  deletePushSubscription,
  getPushPublicKey,
  savePushSubscription,
  sendTestNotification,
} from "../api/notificationsApi";
import { describeError } from "../errorMessages";
import { texts } from "../translations/cs";
import { defaultExpirationWarningDays } from "../stock/expiration";
import { currentBrowser } from "./browser";
import { useCurrentHousehold } from "./useCurrentHousehold";
import { deniedHint, subscribeFailedHint, unsupportedHint } from "./notificationHints";

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
  const { household } = useCurrentHousehold();
  const [browser] = useState(currentBrowser);
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    isSupported && Notification.permission === "denied" ? deniedHint(currentBrowser()) : null,
  );
  const [testMessage, setTestMessage] = useState<{ severity: "success" | "warning"; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (!isSupported) {
      return;
    }
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        setIsSubscribed(subscription !== null);
        if (subscription) {
          setErrorMessage(null);
        }
      })
      .catch(() => setIsSubscribed(false));
  }, []);

  async function subscribe() {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setErrorMessage(deniedHint(browser));
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

  async function sendTest() {
    setTestMessage(null);
    setIsBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setIsSubscribed(false);
        throw new Error("No subscription");
      }
      await sendTestNotification(subscription.endpoint);
      setTestMessage({ severity: "success", text: texts.notifications.testSent });
    } catch {
      setTestMessage({ severity: "warning", text: texts.notifications.testFailed });
    } finally {
      setIsBusy(false);
    }
  }

  async function toggle(enabled: boolean) {
    setErrorMessage(null);
    setTestMessage(null);
    setIsBusy(true);
    try {
      await (enabled ? subscribe() : unsubscribe());
    } catch (error) {
      if (error instanceof ApiError && error.status === 503) {
        setErrorMessage(texts.notifications.notConfigured);
      } else if (error instanceof DOMException) {
        setErrorMessage(subscribeFailedHint(browser));
      } else {
        setErrorMessage(describeError(error));
      }
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section>
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
            {texts.notifications.description(
              household?.notificationHour ?? 8,
              household?.expirationWarningDays ?? defaultExpirationWarningDays,
            )}
          </Typography>
          {isSubscribed && (
            <Button variant="outlined" onClick={sendTest} disabled={isBusy} sx={{ mt: 2 }}>
              {texts.notifications.sendTest}
            </Button>
          )}
          {testMessage && (
            <Alert severity={testMessage.severity} sx={{ mt: 2 }}>
              {testMessage.text}
            </Alert>
          )}
        </>
      ) : (
        <Alert severity="info">{unsupportedHint(browser)}</Alert>
      )}
      {errorMessage && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {errorMessage}
        </Alert>
      )}
    </section>
  );
}
