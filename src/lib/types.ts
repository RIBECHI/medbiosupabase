

import { Timestamp, FirestoreDataConverter, DocumentData, QueryDocumentSnapshot, FieldValue, WithFieldValue } from 'firebase/firestore';

// Represents a system user who can log in.
export type User = {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
};

export const userConverter: FirestoreDataConverter<User> = {
    toFirestore(user: WithFieldValue<Omit<User, 'id'>>): DocumentData {
        return user;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): User {
      const data = snapshot.data();
      return {
        id: snapshot.id,
        displayName: data.displayName || '',
        email: data.email || '',
        photoURL: data.photoURL || `https://picsum.photos/seed/${snapshot.id}/100/100`,
      };
    },
};

// Represents a clinic's client/patient.
export type Client = {
  id: string; // The ID is required when reading, but not when creating
  displayName: string;
  email: string;
  phone?: string;
  cpf?: string;
  photoURL: string;
  joinDate?: FieldValue | Timestamp | Date | string;
  dob?: string | null;
  address?: string;
  notes?: string;
  demographics?: { age: number; gender: string; location: string };
  medicalHistory?: string[];
  consentForms?: { name: string; status: 'Assinado' | 'Pendente'; date: string }[];
};


export const clientConverter: FirestoreDataConverter<Client> = {
    toFirestore(client: WithFieldValue<Omit<Client, 'id'>>): DocumentData {
        return client;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): Client {
      const data = snapshot.data();
      return {
        id: snapshot.id,
        displayName: data.displayName || '',
        email: data.email || '',
        phone: data.phone,
        cpf: data.cpf,
        photoURL: data.photoURL || `https://picsum.photos/seed/${snapshot.id}/100/100`, // Fallback
        joinDate: data.joinDate,
        dob: data.dob,
        address: data.address,
        notes: data.notes,
        demographics: data.demographics,
        medicalHistory: data.medicalHistory,
        consentForms: data.consentForms,
      };
    },
};

export type Treatment = {
  id: string;
  clientId: string;
  date: FieldValue | Timestamp | Date | string;
  serviceName: string;
  professional: string;
  price: number;
  notes?: string;
};

export const treatmentConverter: FirestoreDataConverter<Treatment> = {
    toFirestore(treatment: WithFieldValue<Omit<Treatment, 'id'>>): DocumentData {
        return treatment;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): Treatment {
        const data = snapshot.data();
        return {
            id: snapshot.id,
            clientId: snapshot.ref.parent.parent?.id ?? '',
            date: data.date instanceof Timestamp ? data.date.toDate() : new Date(),
            serviceName: data.serviceName,
            professional: data.professional,
            price: data.price,
            notes: data.notes,
        };
    },
};


export type Appointment = {
  id: string;
  clientId: string;
  clientName: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'Confirmado' | 'Pendente' | 'Cancelado' | 'Concluído';
  notes?: string;
};

export const appointmentConverter: FirestoreDataConverter<Appointment> = {
    toFirestore(appointment: WithFieldValue<Omit<Appointment, 'id'>>): DocumentData {
        return appointment;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): Appointment {
        const data = snapshot.data();
        return {
            id: snapshot.id,
            clientId: data.clientId,
            clientName: data.clientName,
            serviceName: data.serviceName,
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
            status: data.status,
            notes: data.notes,
        };
    },
};


export type Product = {
  id: string;
  name: string;
  category: string;
  stock: number;
  maxStock: number;
  lowStockThreshold: number;
  lastRestock: string;
};

export type TreatmentPlan = {
  id: string;
  clientId: string;
  name: string;
  startDate: FieldValue | Timestamp | Date | string;
  status: 'Ativo' | 'Concluído' | 'Em Espera';
  sessions: {
    sessionNumber: number;
    date: string;
    description: string;
    completed: boolean;
  }[];
  notes?: string;
  totalValue: number;
  progressNotes?: string;
  clientFeedback?: string;
  currentTreatmentPlan?: string;
  preCareInstructions?: string;
  postCareInstructions?: string;
};

export const treatmentPlanConverter: FirestoreDataConverter<TreatmentPlan> = {
    toFirestore(plan: WithFieldValue<Omit<TreatmentPlan, 'id'>>): DocumentData {
        return plan;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): TreatmentPlan {
        const data = snapshot.data();
        return {
            id: snapshot.id,
            clientId: snapshot.ref.parent.parent?.id || '',
            name: data.name,
            startDate: data.startDate,
            status: data.status,
            sessions: data.sessions || [],
            notes: data.notes,
            totalValue: data.totalValue || 0,
            progressNotes: data.progressNotes,
            clientFeedback: data.clientFeedback,
            currentTreatmentPlan: data.currentTreatmentPlan,
            preCareInstructions: data.preCareInstructions,
            postCareInstructions: data.postCareInstructions,
        };
    },
};


export type Kpi = {
  label: string;
  value: string;
  change?: string;
  changeType?: 'increase' | 'decrease';
  description: string;
};

export type N8nLog = {
    id: string;
    receivedAt: Timestamp;
    isRead: boolean;
    data: {
        senderPhone?: string; 
        clientName?: string;
        clientPhone?: string; 
        sentDate?: string | Date;
        content?: string;
        message?: string;
        [key: string]: any;
    }
}

export const n8nLogConverter: FirestoreDataConverter<N8nLog> = {
    toFirestore(log: WithFieldValue<Omit<N8nLog, 'id'>>): DocumentData {
        return log;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): N8nLog {
        const data = snapshot.data();
        return {
            id: snapshot.id,
            receivedAt: data.receivedAt,
            isRead: data.isRead || false, // Garante que o valor padrão seja false
            data: data.data,
        };
    },
};

export type WhatsAppMessage = {
    id: string;
    clientName: string;
    clientPhone: string;
    senderPhone?: string;
    sentDate: Timestamp;
    content: string; // Message from client
    message: string; // Message from attendant
    createdAt: Timestamp;
    isRead: boolean;
    isClient: boolean;
};

export const whatsAppMessageConverter: FirestoreDataConverter<WhatsAppMessage> = {
    toFirestore(message: WithFieldValue<Omit<WhatsAppMessage, 'id'>>): DocumentData {
        return message;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): WhatsAppMessage {
        const data = snapshot.data();
        return {
            id: snapshot.id,
            clientName: data.clientName,
            clientPhone: data.clientPhone,
            senderPhone: data.senderPhone,
            sentDate: data.sentDate,
            content: data.content,
            message: data.message,
            createdAt: data.createdAt,
            isRead: data.isRead || false,
            isClient: data.isClient || false, // Garante que o valor padrão seja false
        };
    },
};


export type LeadStatus = string;

export type LeadInteractionType = "Chamada Telefônica" | "Mensagem WhatsApp" | "E-mail" | "Reunião Presencial" | "Nota Interna";

export type LeadHistory = {
  id: string;
  leadId: string;
  date: FieldValue | Timestamp;
  interactionType: LeadInteractionType;
  summary: string;
  nextAction?: string;
  nextActionDate?: string | null;
};

export const leadHistoryConverter: FirestoreDataConverter<LeadHistory> = {
    toFirestore(history: WithFieldValue<Omit<LeadHistory, 'id'>>): DocumentData {
        return history;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): LeadHistory {
        const data = snapshot.data();
        return {
            id: snapshot.id,
            leadId: data.leadId,
            date: data.date,
            interactionType: data.interactionType,
            summary: data.summary,
            nextAction: data.nextAction,
            nextActionDate: data.nextActionDate,
        };
    },
};

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  source: string;
  status: LeadStatus;
  owner: string;
  potentialValue: number;
  notes?: string;
  createdAt?: FieldValue | Timestamp | Date | string;
};


export const leadConverter: FirestoreDataConverter<Lead> = {
    toFirestore(lead: WithFieldValue<Omit<Lead, 'id'>>): DocumentData {
        return lead;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): Lead {
        const data = snapshot.data();
        return {
            id: snapshot.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            source: data.source,
            status: data.status,
            owner: data.owner,
            potentialValue: data.potentialValue,
            notes: data.notes,
            createdAt: data.createdAt,
        };
    },
};


export type Quote = {
  id: string;
  clientId: string;
  clientName: string;
  date: FieldValue | Timestamp | Date | string;
  status: 'Pendente' | 'Aprovado' | 'Recusado';
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
  totalAmount: number;
  notes?: string;
};

export const quoteConverter: FirestoreDataConverter<Quote> = {
  toFirestore(quote: WithFieldValue<Omit<Quote, 'id'>>): DocumentData {
    return quote;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Quote {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      clientId: data.clientId,
      clientName: data.clientName,
      date: data.date,
      status: data.status,
      items: data.items || [],
      totalAmount: data.totalAmount || 0,
      notes: data.notes,
    };
  },
};

export type Service = {
  id: string;
  name: string;
  description: string;
  category: string;
  duration: number; // in minutes
  price: number;
};

export const serviceConverter: FirestoreDataConverter<Service> = {
    toFirestore(service: WithFieldValue<Omit<Service, 'id'>>): DocumentData {
        return service;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): Service {
        const data = snapshot.data();
        return {
            id: snapshot.id,
            name: data.name || '',
            description: data.description || '',
            category: data.category || '',
            duration: data.duration || 0,
            price: data.price || 0,
        };
    },
};

export type LeadStage = {
    id: string;
    name: string;
    order: number;
    color: string;
    description?: string;
};

export const leadStageConverter: FirestoreDataConverter<LeadStage> = {
    toFirestore(stage: WithFieldValue<Omit<LeadStage, 'id'>>): DocumentData {
        return stage;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): LeadStage {
        const data = snapshot.data();
        return {
            id: snapshot.id,
            name: data.name || '',
            order: data.order ?? 0,
            color: data.color || '#cccccc',
            description: data.description,
        };
    },
};

export type GeneralSettings = {
    id: 'general';
    logoUrl?: string;
    n8nTrainingWebhookUrl?: string;
};
    
export const settingsConverter: FirestoreDataConverter<GeneralSettings> = {
    toFirestore(settings: WithFieldValue<GeneralSettings>): DocumentData {
        return settings;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): GeneralSettings {
        const data = snapshot.data();
        return {
            id: 'general',
            logoUrl: data.logoUrl,
            n8nTrainingWebhookUrl: data.n8nTrainingWebhookUrl,
        };
    },
};

export type AITrainingData = {
  id: string;
  topic: string;
  content: string;
  createdAt: FieldValue | Timestamp;
};

export const aiTrainingDataConverter: FirestoreDataConverter<AITrainingData> = {
    toFirestore(data: WithFieldValue<Omit<AITrainingData, 'id'>>): DocumentData {
        return data;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): AITrainingData {
        const data = snapshot.data();
        return {
            id: snapshot.id,
            topic: data.topic || '',
            content: data.content || '',
            createdAt: data.createdAt,
        };
    },
};
    