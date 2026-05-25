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
        const externalIdStr = String(emailOrId);
        await OneSignal.login(externalIdStr);
        console.log(`[OneSignal] Usuário logado: ${externalIdStr}. Opt-In manual necessário via botão.`);
      }
    });
  },

  forcePrompt: async () => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      if (OneSignal.User) {
        if (OneSignal.User.PushSubscription) {
          await OneSignal.User.PushSubscription.optIn();
        }
        await OneSignal.Slidedown.promptPush({ force: true });
        console.log('[OneSignal] Permissão forçada acionada via interação do usuário!');
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
