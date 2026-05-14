import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Users, Plus, Pencil, Trash2, Shield, User as UserIcon, Loader2, Save, X } from 'lucide-react';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  role: string;
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);

  // Form State
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');

  const fetchUsuarios = async () => {
    const token = localStorage.getItem('acorde_token');
    try {
      const res = await fetch('/api/usuarios', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao buscar usuários');
      const data = await res.json();
      setUsuarios(data);
    } catch (error) {
      toast.error('Erro ao carregar a lista de usuários.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const openModal = (user?: Usuario) => {
    if (user) {
      setEditingUser(user);
      setNome(user.nome);
      setEmail(user.email);
      setRole(user.role);
      setPassword(''); // Password only updated if typed
    } else {
      setEditingUser(null);
      setNome('');
      setEmail('');
      setRole('professor');
      setPassword('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingUser ? `/api/usuarios/${editingUser.id}` : '/api/usuarios';
      const method = editingUser ? 'PUT' : 'POST';
      
      const payload: any = { nome, email, role };
      if (password) payload.password = password; // Send password if typed

      if (!editingUser && !password) {
        throw new Error('A senha é obrigatória para novos usuários.');
      }

      const token = localStorage.getItem('acorde_token');
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar usuário');

      toast.success(editingUser ? 'Usuário atualizado!' : 'Usuário criado com sucesso!');
      fetchUsuarios();
      closeModal();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.')) return;
    try {
      const token = localStorage.getItem('acorde_token');
      const res = await fetch(`/api/usuarios/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao deletar usuário');
      toast.success('Usuário removido.');
      fetchUsuarios();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="px-3 py-1 bg-red-500 text-white border-2 border-black text-[9px] font-black uppercase tracking-widest shadow-[2px_2px_0_#000] flex items-center gap-1 w-fit"><Shield className="w-3 h-3" /> MESTRE_ADM</span>;
      case 'professor':
        return <span className="px-3 py-1 bg-[#ff6b00] text-white border-2 border-black text-[9px] font-black uppercase tracking-widest shadow-[2px_2px_0_#000] flex items-center gap-1 w-fit"><UserIcon className="w-3 h-3" /> PROFESSOR</span>;
      case 'secretaria':
        return <span className="px-3 py-1 bg-[#feccba] text-black border-2 border-black text-[9px] font-black uppercase tracking-widest shadow-[2px_2px_0_#000] flex items-center gap-1 w-fit"><Users className="w-3 h-3" /> SECRETARIA</span>;
      case 'aluno':
        return <span className="px-3 py-1 bg-[#25d366] text-white border-2 border-black text-[9px] font-black uppercase tracking-widest shadow-[2px_2px_0_#000] flex items-center gap-1 w-fit"><UserIcon className="w-3 h-3" /> APRENDIZ</span>;
      default:
        return <span className="px-3 py-1 bg-white text-black border-2 border-black text-[9px] font-black uppercase tracking-widest shadow-[2px_2px_0_#000] w-fit">{role}</span>;
    }
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center bg-[#1a0f0a] h-screen items-center"><Loader2 className="w-8 h-8 animate-spin text-[#ff6b00]" /></div>;
  }

  return (
    <div className="flex flex-col flex-1 animate-in fade-in duration-500 bg-[#1a0f0a] h-screen overflow-hidden">
      <header className="h-24 px-8 bg-[#feccba] border-b-4 border-black flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-black uppercase italic italic tracking-tighter flex items-center gap-3">
            <Shield className="w-8 h-8 text-[#ff6b00]" />
            Acessos & Usuários
          </h1>
          <p className="text-[10px] font-black text-[#8e7164] uppercase tracking-widest">Gerencie permissões e acessos ao sistema.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-[#ff6b00] text-white px-6 py-3 border-4 border-black font-black uppercase text-xs shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none flex items-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" /> NOVO_USUÁRIO
        </button>
      </header>

      <div className="p-8 flex-1 overflow-auto">
        <div className="bg-[#fff8f6] border-4 border-black shadow-[8px_8px_0_#000] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#feccba] border-b-4 border-black">
                  <th className="p-4 font-black text-xs text-black uppercase italic italic">NOME</th>
                  <th className="p-4 font-black text-xs text-black uppercase italic italic">E-MAIL_LOGIN</th>
                  <th className="p-4 font-black text-xs text-black uppercase italic italic">PERMISSÃO</th>
                  <th className="p-4 font-black text-xs text-black uppercase italic italic text-right">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/5">
                {usuarios.map(usuario => (
                  <tr key={usuario.id} className="hover:bg-black/5 transition-colors">
                    <td className="p-4 font-black text-black uppercase text-sm">{usuario.nome}</td>
                    <td className="p-4 font-black text-[#8e7164] text-xs uppercase">{usuario.email}</td>
                    <td className="p-4">{getRoleBadge(usuario.role)}</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => openModal(usuario)}
                        className="p-2 border-2 border-black bg-white text-black shadow-[2px_2px_0_#000] hover:translate-y-[-1px] active:translate-y-0 active:shadow-none transition-all"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(usuario.id)}
                        className="p-2 border-2 border-black bg-white text-red-500 shadow-[2px_2px_0_#000] hover:translate-y-[-1px] active:translate-y-0 active:shadow-none transition-all"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {usuarios.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-[#8e7164] font-black uppercase italic italic">
                      NENHUM_USUÁRIO_CADASTRADO
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#fff8f6] border-8 border-black shadow-[12px_12px_0_#000] w-full max-w-md overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 p-4">
                 <button onClick={closeModal} className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all">
                    <X className="w-4 h-4" />
                 </button>
              </div>

              <div className="p-8 border-b-4 border-black bg-[#feccba]">
                <h2 className="text-xl font-black text-black uppercase italic italic flex items-center gap-2">
                  <Shield className="w-6 h-6 text-[#ff6b00]" />
                  {editingUser ? 'EDITAR_ACESSO' : 'NOVO_USUÁRIO'}
                </h2>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-1">NOME_COMPLETO</label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-4 border-black font-black uppercase italic italic text-sm focus:ring-0 outline-none"
                    placeholder="JOÃO PROFESSOR"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-1">E-MAIL_DE_LOGIN</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-4 border-black font-black uppercase italic italic text-sm focus:ring-0 outline-none"
                    placeholder="JOAO@ESCOLA.COM.BR"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-1">NÍVEL_DE_PERMISSÃO</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-4 border-black font-black uppercase italic italic text-sm focus:ring-0 outline-none"
                  >
                    <option value="admin">ADMINISTRADOR (ACESSO TOTAL)</option>
                    <option value="professor">PROFESSOR (PORTAL DO MESTRE)</option>
                    <option value="secretaria">SECRETARIA (GESTÃO)</option>
                    <option value="aluno">ALUNO (ÁREA DO ALUNO)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-1">
                    SENHA {editingUser && '(DEIXE EM BRANCO PARA NÃO ALTERAR)'}
                  </label>
                  <input
                    type="text"
                    required={!editingUser}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-4 border-black font-black uppercase italic italic text-sm focus:ring-0 outline-none"
                    placeholder="DIGITE A SENHA..."
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#ff6b00] text-white py-4 border-4 border-black font-black uppercase shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {editingUser ? 'ATUALIZAR_DADOS' : 'CRIAR_ACESSO'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
    </div>
  );
}
