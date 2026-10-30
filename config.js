/* Configuração da plataforma
   Sem a chave, o app funciona 100% no próprio aparelho (modo local).
   Com URL + chave "anon public" do Supabase, os dados passam a ser
   compartilhados entre todos os aparelhos (online agora, cadastros, OS). */
window.CI_CONFIG = {
  supabaseUrl: 'https://sflfhokpqmrxljowctsf.supabase.co',
  supabaseAnonKey: ''
};
