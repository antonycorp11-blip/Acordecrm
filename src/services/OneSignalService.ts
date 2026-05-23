declare global {
  interface Window {
    OneSignalDeferred: any[];
    OneSignal: any;
  }
}

export const OneSignalService = {
  APP_ID: 'e5e38375-5fd8-4e92-bf0d-29996ba9426d',

  init: async () => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      await OneSignal.init({
        appId: OneSignalService.APP_ID,
        notifyButton: {
          enable: false, // Nós dispararemos o prompt manualmente
        },
      });
      console.log('[OneSignal] SDK Inicializado no Frontend.');
    });
  },

  promptForPermission: async () => {
    return new Promise((resolve) => {
      window.OneSignalDeferred.push(async function(OneSignal: any) {
        await OneSignal.Slidedown.promptPush();
        const permission = await OneSignal.Notifications.permission;
        resolve(permission);
      });
    });
  },

  loginUser: async (emailOrId: string) => {
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      if (OneSignal.User) {
        // Usa o login nativo do SDK v16+
        await OneSignal.login(emailOrId);
        console.log(`[OneSignal] Usuário logado: ${emailOrId}`);
      }
    });
  },

  logoutUser: async () => {
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      if (OneSignal.User) {
        await OneSignal.logout();
        console.log('[OneSignal] Usuário deslogado.');
      }
    });
  }
};
