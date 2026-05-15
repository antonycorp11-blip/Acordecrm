import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ArrowLeft,
  Search,
  Users,
  Clock,
  CreditCard,
  Save,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface ExtractedStudent {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  endereco: string;
  data_nascimento: string;
  responsavel_nome: string;
  responsavel_telefone: string;
  responsavel_cpf: string;
  // Campos extras que podem vir da planilha
  [key: string]: any;
}

export default function Migracao() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedStudents, setExtractedStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Database options
  const [cursos, setCursos] = useState<any[]>([]);
  const [professores, setProfessores] = useState<any[]>([]);
  const [pacotes, setPacotes] = useState<any[]>([]);

  // Migration form state
  const [formData, setFormData] = useState({
    curso_id: '',
    professor_id: '',
    dia_semana: 'segunda',
    horario: '14:00',
    pacote_id: '',
    aulas_restantes: 4,
    reposicoes: '',
    faturas_pendentes: '',
    fatura_mes_atraso: false,
    valor_parcela: '',
    dia_vencimento: 10,
    valor_desconto: '',
    responsavel_nome: '',
    responsavel_telefone: '',
    responsavel_cpf: '',
    total_parcelas: 12
  });

  const calculateAge = (dob: string) => {
    if (!dob) return null;
    try {
      const parts = dob.split('/');
      if (parts.length !== 3) return null;
      const birthDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    } catch { return null; }
  };

  const fetchPending = async () => {
    const token = localStorage.getItem('acorde_token');
    const res = await fetch('/api/migracao/alunos', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setExtractedStudents(data);
  };

  useEffect(() => {
    const token = localStorage.getItem('acorde_token');
    const headers = { 'Authorization': `Bearer ${token}` };

    fetch('/api/cursos', { headers }).then(res => res.json()).then(data => setCursos(data));
    fetch('/api/professores', { headers }).then(res => res.json()).then(data => setProfessores(data));
    fetch('/api/pacotes', { headers }).then(res => res.json()).then(data => setPacotes(data));
    
    fetchPending();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const students = data.map(row => {
          const findVal = (keys: string[]) => {
            const key = Object.keys(row).find(k => keys.some(s => k.toLowerCase().includes(s.toLowerCase())));
            return key ? row[key] : '';
          };

          return {
            nome: findVal(['aluno', 'nome', 'student', 'name']),
            email: findVal(['email', 'e-mail', 'mail', 'contatos']),
            telefone: findVal(['telefone', 'celular', 'phone', 'mobile', 'tel']),
            cpf: findVal(['cpf', 'documento']),
            endereco: findVal(['endereco', 'address', 'logradouro', 'rua']),
            data_nascimento: findVal(['nascimento', 'data', 'birth']),
            responsavel_nome: findVal(['responsavel', 'pai', 'mae', 'guardian', 'parent']),
            responsavel_telefone: findVal(['tel_resp', 'fone_resp', 'responsavel_tel']),
            responsavel_cpf: findVal(['cpf_resp', 'responsavel_cpf']),
            dados_originais: row
          };
        }).filter(s => s.nome);

        // Enviar para o banco em lote (usando endpoint temporário ou loop)
        const token = localStorage.getItem('acorde_token');
        
        // Criar endpoint para batch insert seria melhor, mas para 1 vez podemos fazer aqui ou criar o endpoint
        // Vamos criar o endpoint batch no server.ts em seguida.
        
        const res = await fetch('/api/migracao/batch', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ students })
        });

        if (!res.ok) throw new Error('Erro ao salvar no banco');

        toast.success(`${students.length} alunos importados para a Sala de Espera!`);
        fetchPending();
      } catch (err) {
        console.error(err);
        toast.error('Erro ao processar planilha.');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleMigrate = async () => {
    if (!selectedStudent || !formData.curso_id || !formData.professor_id || !formData.pacote_id) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('acorde_token');
      const payload = {
        ...selectedStudent,
        ...formData,
        migracao_id: selectedStudent.id,
        aulas_restantes: Number(formData.aulas_restantes),
        reposicoes: Number(formData.reposicoes),
        faturas_pendentes: Number(formData.faturas_pendentes),
        valor_parcela: Number(formData.valor_parcela),
        dia_vencimento: Number(formData.dia_vencimento),
        total_parcelas: Number(formData.total_parcelas),
        valor_desconto: Number(formData.valor_desconto) || null
      };

      const res = await fetch('/api/alunos/migracao', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Falha ao migrar aluno');

      toast.success(`Matrícula de ${selectedStudent.nome} finalizada com sucesso!`);
      setSelectedStudent(null);
      fetchPending();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = extractedStudents.filter(s => 
    s.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden bg-[#1a0f0a] font-['Space_Mono']">
      
      {/* HEADER */}
      <header className="h-20 px-8 border-b-4 border-[#3d2d26] flex items-center justify-between shrink-0 bg-[#1a0f0a]">
        <div>
          <h1 className="text-xl font-black text-white tracking-widest uppercase flex items-center gap-2 italic">
            <UserPlus className="w-6 h-6 text-[#ff6b00]" />
            SALA DE ESPERA (MIGRAÇÃO)
          </h1>
          <p className="text-[10px] font-black text-[#8e7164] uppercase tracking-tighter">Importação direta via planilha Emusys</p>
        </div>
        
        <label className="flex items-center gap-3">
            <input type="file" className="hidden" onChange={handleFileUpload} accept=".xlsx, .xls, .csv" />
            <span className="text-[10px] font-black text-white bg-[#ff6b00] px-4 py-2 border-2 border-black shadow-[4px_4px_0_#000] uppercase hover:bg-[#e65a00] transition-all cursor-pointer flex items-center gap-2">
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                Importar Nova Planilha
            </span>
        </label>
      </header>

      {/* CONTENT */}
      <div className="p-8 flex-1 overflow-auto flex flex-col gap-8">
        
        {extractedStudents.length === 0 && !uploading ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="w-full max-w-2xl bg-[#feccba] border-8 border-black p-12 shadow-[16px_16px_0_#000] text-center space-y-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-4 bg-black/10"></div>
              <div className="bg-[#ff6b00] w-24 h-24 rounded-full flex items-center justify-center mx-auto border-4 border-black shadow-[6px_6px_0_#000]">
                <FileSpreadsheet className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-black uppercase italic tracking-tighter">Sala de Espera Vazia</h2>
                <p className="text-sm font-black text-[#8e7164] uppercase tracking-widest mt-2">Importe uma planilha para começar a migração</p>
              </div>
              <label className="inline-block">
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".xlsx, .xls, .csv" />
                <span className="bg-black text-white px-12 py-4 border-4 border-white font-black uppercase text-sm cursor-pointer hover:bg-[#ff6b00] transition-all shadow-[8px_8px_0_#000] active:translate-y-1 active:shadow-none block">
                  {uploading ? 'PROCESSANDO...' : 'SELECIONAR PLANILHA'}
                </span>
              </label>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden">
            
            {/* LISTA DE ALUNOS */}
            <div className="w-full lg:w-1/3 flex flex-col gap-4 overflow-hidden">
              <div className="bg-[#feccba] border-4 border-black p-4 shadow-[4px_4px_0_#000]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="BUSCAR NA LISTA..."
                    className="w-full pl-10 pr-4 py-3 bg-white border-2 border-black font-black text-xs uppercase focus:outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredStudents.map((student, idx) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      key={student.cpf || student.nome + idx}
                      onClick={() => {
                        setSelectedStudent(student);
                        
                        // Tentar extrair valor da mensalidade dos dados originais
                        const valorOrig = student.dados_originais?.['Mensalidades'];
                        let valorNum = 0;
                        if (valorOrig) {
                            valorNum = parseFloat(valorOrig.toString().replace(',', '.'));
                        }

                        setFormData(prev => ({
                          ...prev,
                          valor_parcela: valorNum || prev.valor_parcela,
                          responsavel_nome: student.responsavel_nome || '',
                          responsavel_telefone: '',
                          responsavel_cpf: ''
                        }));
                      }}
                      className={`p-4 border-4 cursor-pointer transition-all flex items-center justify-between group ${
                        selectedStudent === student 
                          ? 'bg-[#ff6b00] border-black text-white shadow-[4px_4px_0_#000] translate-x-1' 
                          : 'bg-[#fff8f6] border-black text-black hover:bg-[#ffeae1]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 border-2 border-black flex items-center justify-center font-black text-lg ${
                          selectedStudent === student ? 'bg-white text-[#ff6b00]' : 'bg-[#feccba] text-black'
                        }`}>
                          {student.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase italic tracking-tight truncate max-w-[150px]">{student.nome}</p>
                          <div className="flex items-center gap-2">
                            <p className={`text-[9px] font-black uppercase ${selectedStudent === student ? 'text-white/70' : 'text-[#8e7164]'}`}>
                                {student.email || 'SEM E-MAIL'}
                            </p>
                            {calculateAge(student.data_nascimento) !== null && (
                                <span className={`text-[8px] px-1 border border-black font-black ${
                                    (calculateAge(student.data_nascimento) ?? 0) < 18 ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                                }`}>
                                    {calculateAge(student.data_nascimento)} ANOS
                                </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {(calculateAge(student.data_nascimento) ?? 0) < 18 && (
                            <AlertCircle className="w-4 h-4 text-red-600 animate-pulse" />
                        )}
                        <ChevronRight className={`w-5 h-5 transition-transform ${selectedStudent === student ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredStudents.length === 0 && (
                  <div className="p-12 text-center border-4 border-dashed border-[#3d2d26] bg-black/20">
                    <p className="text-[10px] font-black text-[#8e7164] uppercase tracking-widest">Nenhum aluno encontrado</p>
                  </div>
                )}
              </div>
            </div>

            {/* FORMULÁRIO DE FINALIZAÇÃO */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence mode="wait">
                {!selectedStudent ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex items-center justify-center bg-black/20 border-4 border-dashed border-[#3d2d26]"
                  >
                    <div className="text-center space-y-4">
                      <Users className="w-12 h-12 text-[#8e7164] mx-auto opacity-20" />
                      <p className="text-sm font-black text-[#8e7164] uppercase tracking-widest">Selecione um aluno na lista para finalizar</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={selectedStudent.nome}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-[#ffeae1] border-8 border-black p-8 shadow-[12px_12px_0_#000] space-y-10"
                  >
                    {/* INFO PESSOAL (READ ONLY) */}
                    <div className="space-y-6">
                      {(calculateAge(selectedStudent.data_nascimento) ?? 0) < 18 && (
                        <div className="bg-red-600 border-4 border-black p-4 flex items-center gap-3 animate-pulse">
                            <AlertCircle className="w-8 h-8 text-white" />
                            <div>
                                <p className="text-sm font-black text-white uppercase italic tracking-tighter">ALUNO MENOR DE IDADE ({calculateAge(selectedStudent.data_nascimento)} ANOS)</p>
                                <p className="text-[10px] font-black text-white/80 uppercase">VERIFIQUE E COMPLETE OS DADOS DO RESPONSÁVEL ABAIXO</p>
                            </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 border-b-4 border-black pb-4">
                        <div className="bg-[#ff6b00] p-3 border-4 border-black text-white"><Users className="w-6 h-6" /></div>
                        <div>
                          <h2 className="text-2xl font-black text-black uppercase italic tracking-tighter">FICHA DO ALUNO</h2>
                          <p className="text-[10px] font-black text-[#8e7164] uppercase">Dados extraídos da planilha</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 text-xs font-black uppercase">
                            <span className="w-24 text-[#8e7164]">NOME:</span>
                            <span className="text-black italic">{selectedStudent.nome}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-black uppercase">
                            <span className="w-24 text-[#8e7164]">E-MAIL:</span>
                            <span className="text-black">{selectedStudent.email || '---'}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-black uppercase">
                            <span className="w-24 text-[#8e7164]">WHATSAPP:</span>
                            <span className="text-black">{selectedStudent.telefone || '---'}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-black uppercase">
                            <span className="w-24 text-[#8e7164]">CPF:</span>
                            <span className="text-black">{selectedStudent.cpf || '---'}</span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 text-xs font-black uppercase">
                            <span className="w-24 text-[#8e7164]">RESP:</span>
                            <span className="text-black">{selectedStudent.responsavel_nome || 'PRÓPRIO'}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-black uppercase">
                            <span className="w-24 text-[#8e7164]">LOGRAD.:</span>
                            <span className="text-black truncate">{selectedStudent.endereco || '---'}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-black uppercase">
                            <span className="w-24 text-[#8e7164]">NASCIM.:</span>
                            <span className="text-black">{selectedStudent.data_nascimento || '---'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CONFIGURAÇÃO DA MATRÍCULA */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b-4 border-black pb-4">
                        <div className="bg-black p-3 border-4 border-black text-white"><Calendar className="w-6 h-6" /></div>
                        <div>
                          <h2 className="text-2xl font-black text-black uppercase italic tracking-tighter">AJUSTES DE MIGRACÃO</h2>
                          <p className="text-[10px] font-black text-[#8e7164] uppercase">Preencha as informações operacionais</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        {/* COLUNA 1: AGENDA & RESPONSÁVEL */}
                        <div className="space-y-6">
                          <h3 className="text-xs font-black text-[#ff6b00] uppercase tracking-widest border-l-4 border-[#ff6b00] pl-3">AGENDA & RESPONSÁVEL</h3>
                          
                          {(calculateAge(selectedStudent.data_nascimento) ?? 0) < 18 && (
                            <div className="p-4 bg-white border-4 border-black space-y-4 shadow-[4px_4px_0_#000]">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-black uppercase">NOME DO RESPONSÁVEL</label>
                                    <input 
                                        type="text"
                                        className="w-full p-2 bg-gray-50 border-2 border-black font-black text-[10px] uppercase focus:outline-none"
                                        value={formData.responsavel_nome}
                                        onChange={e => setFormData({...formData, responsavel_nome: e.target.value})}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-black uppercase">CPF RESP.</label>
                                        <input 
                                            type="text"
                                            className="w-full p-2 bg-gray-50 border-2 border-black font-black text-[10px] uppercase focus:outline-none"
                                            value={formData.responsavel_cpf}
                                            onChange={e => setFormData({...formData, responsavel_cpf: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-black uppercase">WHATSAPP RESP.</label>
                                        <input 
                                            type="text"
                                            className="w-full p-2 bg-gray-50 border-2 border-black font-black text-[10px] uppercase focus:outline-none"
                                            value={formData.responsavel_telefone}
                                            onChange={e => setFormData({...formData, responsavel_telefone: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-black uppercase tracking-widest block">INSTRUMENTO / CURSO</label>
                            <select 
                              className="w-full p-3 bg-white border-4 border-black font-black text-xs uppercase italic focus:outline-none"
                              value={formData.curso_id}
                              onChange={e => setFormData({...formData, curso_id: e.target.value})}
                            >
                              <option value="">SELECIONE...</option>
                              {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-black uppercase tracking-widest block">PROFESSOR</label>
                            <select 
                              className="w-full p-3 bg-white border-4 border-black font-black text-xs uppercase italic focus:outline-none"
                              value={formData.professor_id}
                              onChange={e => setFormData({...formData, professor_id: e.target.value})}
                            >
                              <option value="">SELECIONE...</option>
                              {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-black uppercase tracking-widest block">DIA SEMANA</label>
                              <select 
                                className="w-full p-3 bg-white border-4 border-black font-black text-xs uppercase italic focus:outline-none"
                                value={formData.dia_semana}
                                onChange={e => setFormData({...formData, dia_semana: e.target.value})}
                              >
                                {['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].map(d => (
                                  <option key={d} value={d}>{d.toUpperCase()}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-black uppercase tracking-widest block">HORÁRIO</label>
                              <input 
                                type="time"
                                className="w-full p-2.5 bg-white border-4 border-black font-black text-xs focus:outline-none"
                                value={formData.horario}
                                onChange={e => setFormData({...formData, horario: e.target.value})}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 bg-white border-4 border-black p-4 shadow-[4px_4px_0_#000]">
                              <label className="text-[10px] font-black text-[#ff6b00] uppercase tracking-widest block mb-1">AULAS RESTANTES</label>
                              <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-black" />
                                <input 
                                  type="number"
                                  className="w-full bg-transparent border-none font-black text-lg focus:outline-none"
                                  placeholder="0"
                                  value={formData.aulas_restantes}
                                  onChange={e => setFormData({...formData, aulas_restantes: e.target.value})}
                                />
                              </div>
                            </div>
                            <div className="space-y-2 bg-white border-4 border-black p-4 shadow-[4px_4px_0_#000]">
                              <label className="text-[10px] font-black text-[#8e7164] uppercase tracking-widest block mb-1">REPOSIÇÕES</label>
                              <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-black" />
                                <input 
                                  type="number"
                                  className="w-full bg-transparent border-none font-black text-lg focus:outline-none"
                                  placeholder="0"
                                  value={formData.reposicoes}
                                  onChange={e => setFormData({...formData, reposicoes: e.target.value})}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* COLUNA 2: FINANCEIRO */}
                        <div className="space-y-6">
                          <h3 className="text-xs font-black text-[#ff6b00] uppercase tracking-widest border-l-4 border-[#ff6b00] pl-3">FINANCEIRO & PLANO</h3>
                          
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-black uppercase tracking-widest block">PACOTE / PLANO</label>
                            <select 
                              className="w-full p-3 bg-white border-4 border-black font-black text-xs uppercase italic focus:outline-none"
                              value={formData.pacote_id}
                              onChange={e => {
                                const p = pacotes.find(x => x.id.toString() === e.target.value);
                                setFormData({...formData, pacote_id: e.target.value, valor_parcela: p?.valor_mensal || 0});
                              }}
                            >
                              <option value="">SELECIONE...</option>
                              {pacotes.map(p => <option key={p.id} value={p.id}>{p.nome} - R$ {p.valor_mensal}</option>)}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-black uppercase tracking-widest block">VALOR PARCELA</label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-xs">R$</span>
                                  <input 
                                    type="number"
                                    className="w-full pl-10 pr-4 py-3 bg-white border-4 border-black font-black text-xs focus:outline-none"
                                    placeholder="0.00"
                                    value={formData.valor_parcela}
                                    onChange={e => setFormData({...formData, valor_parcela: e.target.value})}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-black uppercase tracking-widest block">VALOR C/ DESCONTO</label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-xs">R$</span>
                                  <input 
                                    type="number"
                                    className="w-full pl-10 pr-4 py-3 bg-white border-4 border-black font-black text-xs focus:outline-none"
                                    placeholder="0.00"
                                    value={formData.valor_desconto}
                                    onChange={e => setFormData({...formData, valor_desconto: e.target.value})}
                                  />
                                </div>
                              </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-black uppercase tracking-widest block">DIA VENC.</label>
                              <input 
                                type="number"
                                className="w-full p-3 bg-white border-4 border-black font-black text-xs focus:outline-none"
                                placeholder="10"
                                value={formData.dia_vencimento}
                                onChange={e => setFormData({...formData, dia_vencimento: e.target.value})}
                              />
                            </div>
                          </div>

                          <div className="space-y-4 pt-4">
                            <div className="flex items-center gap-3 bg-white border-4 border-black p-4 shadow-[4px_4px_0_#000]">
                              <CreditCard className="w-6 h-6 text-[#ff6b00]" />
                              <div className="flex-1">
                              <p className="text-[10px] font-black text-black uppercase tracking-widest">FATURAS PENDENTES</p>
                              <p className="text-[8px] font-black text-[#8e7164] uppercase tracking-widest">Meses anteriores que o aluno ainda não pagou</p>
                            </div>
                            <input 
                              type="number"
                              className="w-12 bg-transparent border-b-2 border-black font-black text-center focus:outline-none"
                              placeholder="0"
                              value={formData.faturas_pendentes}
                              onChange={e => setFormData({...formData, faturas_pendentes: e.target.value})}
                            />
                            </div>

                            <div className="flex items-center gap-3 bg-white border-4 border-black p-4 shadow-[4px_4px_0_#000]">
                              <FileText className="w-6 h-6 text-[#ff6b00]" />
                              <div className="flex-1">
                                <p className="text-[10px] font-black text-black uppercase tracking-widest">TOTAL DE PARCELAS</p>
                                <p className="text-[8px] font-black text-[#8e7164] uppercase tracking-widest">Duração total do contrato (ex: 12 meses)</p>
                              </div>
                              <input 
                                type="number"
                                className="w-12 bg-transparent border-b-2 border-black font-black text-center focus:outline-none"
                                value={formData.total_parcelas}
                                onChange={e => setFormData({...formData, total_parcelas: e.target.value})}
                              />
                            </div>

                            <button 
                              onClick={() => setFormData({...formData, fatura_mes_atraso: !formData.fatura_mes_atraso})}
                              className={`w-full p-4 border-4 flex items-center justify-between transition-all ${
                                formData.fatura_mes_atraso 
                                  ? 'bg-red-600 border-black text-white shadow-[4px_4px_0_#000]' 
                                  : 'bg-white border-black text-black'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <AlertCircle className={`w-6 h-6 ${formData.fatura_mes_atraso ? 'text-white' : 'text-red-600'}`} />
                                <div className="text-left">
                                  <p className="text-[10px] font-black uppercase tracking-widest">FATURA DO MÊS EM ATRASO?</p>
                                  <p className={`text-[8px] font-black uppercase tracking-widest ${formData.fatura_mes_atraso ? 'text-white/70' : 'text-[#8e7164]'}`}>
                                    Marque se a mensalidade deste mês já venceu e não foi paga
                                  </p>
                                </div>
                              </div>
                              <div className={`w-6 h-6 border-2 border-black rounded-sm flex items-center justify-center ${formData.fatura_mes_atraso ? 'bg-white' : 'bg-transparent'}`}>
                                {formData.fatura_mes_atraso && <CheckCircle2 className="w-4 h-4 text-black" />}
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* BOTÕES DE AÇÃO */}
                    <div className="pt-10 flex gap-4">
                      <button 
                        onClick={() => setSelectedStudent(null)}
                        className="flex-1 py-4 border-4 border-black font-black uppercase text-xs hover:bg-black/5 transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        disabled={loading}
                        onClick={handleMigrate}
                        className="flex-[2] bg-[#ff6b00] text-white py-4 border-4 border-black font-black uppercase text-sm shadow-[8px_8px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        FINALIZAR MATRÍCULA
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
