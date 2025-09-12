import { WorkflowInfo } from './types'

// Fake workflow data för POC - simulerar data från Workflows-applikationen
export const FAKE_WORKFLOWS: WorkflowInfo[] = [
  {
    id: 'workflow-emergency',
    name: 'Akuta Händelser',
    description: 'SOS-larm, bränder, olyckor och andra akuta situationer',
    category: 'emergency'
  },
  {
    id: 'workflow-police',
    name: 'Polishändelser',
    description: 'Brott, trafikolyckor och polisinsatser',
    category: 'police'
  },
  {
    id: 'workflow-weather',
    name: 'Väder & Klimat',
    description: 'SMHI varningar, väderrapporter och klimathändelser',
    category: 'weather'
  },
  {
    id: 'workflow-traffic',
    name: 'Trafik Stockholm',
    description: 'Trafikstörningar och vägarbeten i Stockholmsregionen',
    category: 'traffic'
  },
  {
    id: 'workflow-news',
    name: 'Allmänna Nyheter',
    description: 'TT-telegram och andra allmänna nyhetshändelser',
    category: 'news'
  },
  {
    id: 'workflow-sports',
    name: 'Sport & Idrott',
    description: 'Sportnyheter och idrottsevenemang',
    category: 'sports'
  },
  {
    id: 'workflow-economy',
    name: 'Ekonomi & Börsen',
    description: 'Ekonomiska nyheter och börsuppdateringar',
    category: 'other'
  },
  {
    id: 'workflow-politics-local',
    name: 'Lokalpolitik',
    description: 'Kommunala beslut och lokalpolitiska händelser',
    category: 'other'
  }
]

// Helper-funktioner
export const getWorkflowById = (id: string): WorkflowInfo | undefined => {
  return FAKE_WORKFLOWS.find(w => w.id === id)
}

export const getWorkflowsByCategory = (category: WorkflowInfo['category']): WorkflowInfo[] => {
  return FAKE_WORKFLOWS.filter(w => w.category === category)
}