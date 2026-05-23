declare global {
  interface Window {
    OneSignalDeferred: any[];
    OneSignal: any;
  }
}

export const OneSignalService = {
  APP_ID: 'e5e38375-5fd8-4e92-bf0d-29996ba9426d',

  init: async () => {
    // Inicialização movida para o index.html (Head) para garantir prioridade e evitar TypeError no login
    console.log('[OneSignal] Init hook called mas delegando para head script');
  },

  promptForPermission: async () => {
    return new Promise((resolve) => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal: any) {
        await OneSignal.Slidedown.promptPush();
        const permission = await OneSignal.Notifications.permission;
        resolve(permission);
      });
    });
  },

  loginUser: async (emailOrId: string | number) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      if (OneSignal.User) {
        // Usa o login nativo do SDK v16+, que EXIGE que o externalId seja estritamente String
        const externalIdStr = String(emailOrId);
        await OneSignal.login(externalIdStr);
        console.log(`[OneSignal] Usuário logado: ${externalIdStr}`);
      }
    });
  },

  logoutUser: async () => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      if (OneSignal.User) {
        await OneSignal.logout();
        console.log('[OneSignal] Usuário deslogado.');
      }
    });
  }
};
