import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  return phone.split('@')[0].replace(/\D/g, '');
};

const isValidPhone = (phone: string): boolean =>
  normalizePhone(phone).length >= 8;

export async function POST(request: Request) {
  let payload: any;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON inválido.' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Sempre loga para não perder rastro
  await supabase.from('n8n_logs').insert({
    data: payload,
    is_read: false,
  });

  const { clientName, message, content, clientPhone, senderPhone } = payload;

  if (!clientPhone || (!content && !message)) {
    return NextResponse.json({ success: true, message: 'Log salvo. Sem dados suficientes.' });
  }

  const normalizedPhone = normalizePhone(clientPhone);

  // Verifica se é cliente com query direcionada (sem buscar toda a tabela)
  const { data: clientMatch } = await supabase
    .from('clients')
    .select('id')
    .or(`phone.eq.${normalizedPhone},phone.ilike.%${normalizedPhone.slice(-8)}`)
    .limit(1)
    .maybeSingle();

  const isClient = !!clientMatch;

  // Salva mensagem
  const { error } = await supabase.from('whatsapp_messages').insert({
    client_name: clientName || 'Desconhecido',
    client_phone: normalizedPhone,
    sender_phone: isValidPhone(senderPhone) ? normalizePhone(senderPhone) : null,
    content: content || '',   // resposta da IA
    message: message || '',   // mensagem do cliente
    is_read: false,
    is_client: isClient,
  });

  if (error) {
    console.error('Erro ao salvar mensagem:', error.message);
    return NextResponse.json({ success: false, error: 'Erro ao salvar mensagem.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Webhook processado com sucesso.' });
}
