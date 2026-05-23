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
        
        // MAGICA PARA REATIVAR USUARIOS ÓRFÃOS SILENCIOSAMENTE!
        // Força a re-inscrição do push usando a permissão já concedida pelo iOS na URL do site
        if (OneSignal.User.PushSubscription) {
          await OneSignal.User.PushSubscription.optIn();
        }
        // Se a permissão nativa não existir (novo aparelho), pede com pop-up
        await OneSignal.Slidedown.promptPush({ force: true });
        
        console.log(`[OneSignal] Usuário logado e Push forçado: ${externalIdStr}`);
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
