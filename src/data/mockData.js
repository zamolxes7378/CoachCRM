export const mockUser = {
  id: 'therapist-1',
  name: 'Anne-Chantal Meyer',
  email: 'anne-chantal.meyer@gmail.com',
  role: 'admin',
  photoURL: null
};

/**
 * Convention vocabulaire :
 * - "Parrainage" = entre particuliers (clients existants ou externes)
 * - "Recommandation" = par un professionnel externe (Réseau Pro)
 * Source 'referral' dans les données = Parrainage (label affiché = "Parrainage")
 */
export const mockProfessionals = [
  {
    id: 'pro-1',
    firstName: 'Dr. Fabienne',
    lastName: 'MOREL',
    email: 'f.morel@cabinet-psy.fr',
    phone: '01 45 67 89 00',
    company: 'Cabinet Sainte-Anne',
    specialty: 'Psychiatre',
    address: '12 rue Sainte-Anne, 75001 Paris',
    website: 'https://cabinet-sainte-anne.fr',
    note: 'Adresse les patients en thérapie de couple après bilan initial',
    createdAt: '2026-01-10',
    referrals: [
      { clientId: 'c1', date: '2026-01-10', clientName: 'Sophie et Thomas DUPONT' }
    ]
  }
];

export const mockCouples = [
  {
    id: 'c1',
    type: 'couple',
    deleted: false, deletedAt: null,
    partnerA: { firstName: 'Sophie', lastName: 'Dupont', email: 'sophie.d@email.com', phone: '06 12 34 56 78' },
    partnerB: { firstName: 'Thomas', lastName: 'Dupont', email: 'thomas.d@email.com', phone: '06 98 76 54 32' },
    phase: 'analyse',
    source: 'website',
    status: 'active',
    startDate: '2025-11-15',
    sessionsCount: 12,
    totalSessions: 20,
    nextSession: '2026-03-19T14:00:00',
    lastSession: '2026-03-05',
    emotionalMaturity: 62,
    emotionalMaturityHistory: [30, 35, 38, 42, 45, 48, 50, 52, 55, 58, 60, 62],
    notes: 'Couple marié depuis 8 ans. Problème de communication principal.',
    exercises: [
      { id: 'e1', title: 'Journal des émotions quotidien', status: 'completed', dueDate: '2026-03-10' },
      { id: 'e2', title: 'Exercice d\'écoute active (15 min/jour)', status: 'in-progress', dueDate: '2026-03-20' },
      { id: 'e3', title: 'Lettre de gratitude au partenaire', status: 'pending', dueDate: '2026-03-25' }
    ],
    clientLinks: [
      { clientId: 'c6', type: 'dossier' }
    ]
  },
  {
    id: 'c2',
    type: 'couple',
    deleted: false, deletedAt: null,
    partnerA: { firstName: 'Claire', lastName: 'Martin', email: 'claire.m@email.com', phone: '06 11 22 33 44' },
    partnerB: { firstName: 'Lucas', lastName: 'Martin', email: 'lucas.m@email.com', phone: '06 55 66 77 88' },
    phase: 'debut',
    source: 'phone',
    status: 'active',
    startDate: '2026-02-01',
    sessionsCount: 3,
    totalSessions: 20,
    nextSession: '2026-03-19T16:00:00',
    lastSession: '2026-03-12',
    emotionalMaturity: 28,
    emotionalMaturityHistory: [20, 24, 28],
    notes: 'En couple depuis 3 ans, pas mariés. Premiers signes de crise.',
    exercises: [
      { id: 'e4', title: 'Identifier 3 besoins fondamentaux', status: 'completed', dueDate: '2026-03-05' }
    ]
  },
  {
    id: 'c3',
    type: 'couple',
    deleted: false, deletedAt: null,
    partnerA: { firstName: 'Isabelle', lastName: 'Rey', email: 'isa.r@email.com', phone: '06 99 88 77 66' },
    partnerB: { firstName: 'Marc', lastName: 'Rey', email: 'marc.r@email.com', phone: '06 44 33 22 11' },
    phase: 'integration',
    source: 'referral',
    status: 'active',
    startDate: '2025-06-10',
    sessionsCount: 15,
    totalSessions: 20,
    nextSession: '2026-03-21T10:00:00',
    lastSession: '2026-03-14',
    emotionalMaturity: 78,
    emotionalMaturityHistory: [25, 30, 35, 40, 45, 50, 55, 58, 62, 65, 68, 70, 73, 75, 78],
    notes: 'Très bonne progression. Phase d\'intégration en cours.',
    exercises: [
      { id: 'e5', title: 'Rituel de connexion quotidien', status: 'in-progress', dueDate: '2026-03-30' },
      { id: 'e6', title: 'Pratique CNV en situation de conflit', status: 'in-progress', dueDate: '2026-04-05' }
    ],
    clientLinks: [
      { clientId: 'c9', type: 'parrainage', role: 'parrain' }
    ]
  },
  {
    id: 'c4',
    type: 'couple',
    deleted: false, deletedAt: null,
    partnerA: { firstName: 'Julie', lastName: 'Bernard', email: 'julie.b@email.com', phone: '06 10 20 30 40' },
    partnerB: { firstName: 'Pierre', lastName: 'Bernard', email: 'pierre.b@email.com', phone: '06 50 60 70 80' },
    phase: 'analyse',
    source: 'phone',
    status: 'active',
    startDate: '2025-09-20',
    sessionsCount: 8,
    totalSessions: 20,
    nextSession: '2026-03-22T11:00:00',
    lastSession: '2026-03-12',
    emotionalMaturity: 45,
    emotionalMaturityHistory: [22, 25, 28, 32, 35, 38, 42, 45],
    notes: 'Enjeux de parentalité et répartition des tâches.',
    exercises: [
      { id: 'e7', title: 'Planning parental équilibré', status: 'pending', dueDate: '2026-03-18' }
    ]
  },
  {
    id: 'c5',
    type: 'couple',
    deleted: false, deletedAt: null,
    partnerA: { firstName: 'Émilie', lastName: 'Leroy', email: 'emilie.l@email.com', phone: '06 11 33 55 77' },
    partnerB: { firstName: 'Nicolas', lastName: 'Leroy', email: 'nicolas.l@email.com', phone: '06 22 44 66 88' },
    phase: 'debut',
    source: 'website',
    status: 'inactive',
    startDate: '2026-03-01',
    sessionsCount: 2,
    totalSessions: 20,
    nextSession: null,
    lastSession: '2026-03-10',
    emotionalMaturity: 22,
    emotionalMaturityHistory: [18, 22],
    notes: 'Couple en pause depuis le 10 mars. Raison : voyage à l\'étranger. Reprise prévue en avril.',
    exercises: []
  },
  {
    id: 'c6',
    type: 'individual',
    deleted: false, deletedAt: null,
    partnerA: { firstName: 'Claudia', lastName: 'Pavel', email: 'claudia.p@email.com', phone: '06 77 88 99 00' },
    partnerB: null,
    phase: 'bilan_final',
    source: 'referral',
    status: 'active',
    startDate: '2025-07-20',
    sessionsCount: 16,
    totalSessions: 20,
    nextSession: '2026-03-19T21:00:00',
    lastSession: '2026-03-17',
    emotionalMaturity: 82,
    emotionalMaturityHistory: [28, 32, 38, 42, 48, 52, 56, 60, 63, 66, 70, 73, 75, 78, 80, 82],
    status: 'active',
    notes: 'Thérapie terminée avec succès. Excellente progression du couple.',
    exercises: [
      { id: 'e8', title: 'Méditation guidée (10 min/jour)', status: 'in-progress', dueDate: '2026-04-01' },
      { id: 'e9', title: 'Bilan hebdomadaire en autonomie', status: 'in-progress', dueDate: '2026-04-10' }
    ],
    clientLinks: [
      { clientId: 'c1', type: 'dossier' }
    ]
  },
  {
    id: 'c7',
    type: 'couple',
    deleted: false, deletedAt: null,
    partnerA: { firstName: 'Farah', lastName: 'Benali', email: 'farah.b@email.com', phone: '06 12 00 34 56' },
    partnerB: { firstName: 'Karim', lastName: 'Benali', email: 'karim.b@email.com', phone: '06 78 00 90 12' },
    phase: 'prospect',
    source: 'phone',
    prospectStage: 'discovery_call',
    startDate: '2026-03-18',
    sessionsCount: 0,
    totalSessions: 20,
    nextSession: '2026-03-26T10:00:00',
    lastSession: null,
    emotionalMaturity: 0,
    emotionalMaturityHistory: [],
    notes: 'Premier contact par téléphone. Couple en difficulté depuis 2 ans. Rendez-vous de découverte prévu.',
    exercises: []
  },
  {
    id: 'c8',
    type: 'couple',
    deleted: false, deletedAt: null,
    partnerA: { firstName: 'Nadia', lastName: 'Rousseau', email: 'nadia.r@email.com', phone: '06 33 44 55 66' },
    partnerB: { firstName: 'Olivier', lastName: 'Rousseau', email: 'olivier.r@email.com', phone: '06 77 88 11 22' },
    phase: 'prospect',
    source: 'website',
    prospectStage: 'first_contact',
    startDate: '2026-03-15',
    sessionsCount: 0,
    totalSessions: 20,
    nextSession: null,
    lastSession: null,
    emotionalMaturity: 0,
    emotionalMaturityHistory: [],
    notes: 'Formulaire rempli via le site web. En attente de rappel.',
    exercises: []
  },
  {
    id: 'c9',
    type: 'couple',
    deleted: false, deletedAt: null,
    partnerA: { firstName: 'Sabrina', lastName: 'Duval', email: 'sabrina.d@email.com', phone: '06 55 66 77 88' },
    partnerB: { firstName: 'Mathieu', lastName: 'Duval', email: 'mathieu.d@email.com', phone: '06 99 00 11 22' },
    phase: 'prospect',
    source: 'referral',
    referredBy: 'c3',
    prospectStage: 'appointment_set',
    startDate: '2026-03-10',
    sessionsCount: 0,
    totalSessions: 20,
    nextSession: '2026-03-25T14:00:00',
    lastSession: null,
    emotionalMaturity: 0,
    emotionalMaturityHistory: [],
    notes: 'Recommandé par le couple Rey. RDV découverte fixé au 25 mars.',
    exercises: [],
    clientLinks: [
      { clientId: 'c3', type: 'parrainage', role: 'filleul' }
    ]
  },
  {
    id: 'c10',
    type: 'individual',
    deleted: false, deletedAt: null,
    partnerA: { firstName: 'Antoine', lastName: 'Mercier', email: 'antoine.m@email.com', phone: '06 22 33 44 55' },
    partnerB: null,
    phase: 'prospect',
    source: 'phone',
    prospectStage: 'converted',
    startDate: '2026-03-05',
    sessionsCount: 0,
    totalSessions: 20,
    nextSession: '2026-03-20T09:00:00',
    lastSession: null,
    emotionalMaturity: 0,
    emotionalMaturityHistory: [],
    notes: 'Converti suite à l\'appel découverte. Première séance prévue le 20 mars.',
    exercises: []
  },
  {
    id: 'c11',
    type: 'couple',
    deleted: false, deletedAt: null,
    partnerA: { firstName: 'Nathalie', lastName: 'Renaud', email: 'nathalie.r@email.com', phone: '06 55 66 77 88' },
    partnerB: { firstName: 'Julien', lastName: 'Renaud', email: 'julien.r@email.com', phone: '06 88 77 66 55' },
    phase: 'prospect',
    source: 'referral',
    referredBy: 'c9',
    prospectStage: 'contacted',
    startDate: '2026-03-18',
    sessionsCount: 0,
    totalSessions: 20,
    nextSession: null,
    lastSession: null,
    emotionalMaturity: 0,
    emotionalMaturityHistory: [],
    notes: 'Demande reçue par email, source inconnue.',
    exercises: []
  },
  {
    id: 'c12',
    type: 'family',
    deleted: false, deletedAt: null,
    partnerA: { firstName: 'Valérie', lastName: 'Moreau', email: 'valerie.m@email.com', phone: '06 22 33 44 55' },
    partnerB: { firstName: 'David', lastName: 'Moreau', email: 'david.m@email.com', phone: '06 66 77 88 99' },
    children: [
      { firstName: 'Léa', birthYear: 2014 },
      { firstName: 'Hugo', birthYear: 2017 }
    ],
    phase: 'analyse',
    source: 'website',
    status: 'active',
    startDate: '2025-10-05',
    sessionsCount: 10,
    totalSessions: 20,
    nextSession: '2026-03-24T09:00:00',
    lastSession: '2026-03-17',
    emotionalMaturity: 55,
    emotionalMaturityHistory: [20, 25, 30, 34, 38, 42, 46, 49, 52, 55],
    notes: 'Famille recomposée. Enjeux de communication parent-enfant et de coparentalité.',
    exercises: [
      { id: 'e10', title: 'Temps familial structuré (30 min/jour)', status: 'in-progress', dueDate: '2026-03-28' },
      { id: 'e11', title: 'Cahier de parole des enfants', status: 'pending', dueDate: '2026-04-05' }
    ]
  }
];

export const mockSessions = [
  {
    id: 's23', coupleId: 'c3', date: '2026-03-20T10:00:00', duration: 60,
    phase: 'integration', status: 'completed', audioFile: 'session_15b.m4a', hasReport: true,
    title: 'Séance #15b — Bilan matinal', summary: 'Point étape', paymentMethod: null
  },
  {
    id: 's24', coupleId: 'c1', date: '2026-03-20T18:00:00', duration: 75,
    phase: 'analyse', status: 'completed', audioFile: null, hasReport: false,
    title: 'Séance #13b — Écoute active', paymentMethod: 'virement', paymentReceived: false
  },
  {
    id: 's25', coupleId: 'c6', date: '2026-03-20T21:00:00', duration: 60,
    phase: 'integration', status: 'completed', audioFile: null, hasReport: false,
    title: 'Séance #19 — Suivi à distance', paymentMethod: 'virement', paymentReceived: true
  },
  {
    id: 's1', coupleId: 'c1', date: '2026-03-19T14:00:00', duration: 75,
    phase: 'analyse', status: 'completed', audioFile: null, hasReport: false,
    title: 'Séance #13 — Communication non violente', paymentMethod: 'cheque', paymentReceived: false
  },
  {
    id: 's2', coupleId: 'c1', date: '2026-03-05T14:00:00', duration: 90,
    phase: 'analyse', status: 'completed', audioFile: 'session_12.m4a', hasReport: true,
    title: 'Séance #12 — Patterns d\'évitement', summary: 'Évitement conflits', paymentMethod: 'cheque', paymentReceived: true, needsInvoice: true
  },
  {
    id: 's3', coupleId: 'c1', date: '2026-02-19T14:00:00', duration: 80,
    phase: 'analyse', status: 'completed', audioFile: 'session_11.m4a', hasReport: true,
    title: 'Séance #11 — Gestion de la colère', summary: 'Colère et triggers', paymentMethod: 'virement', paymentReceived: true
  },
  {
    id: 's4', coupleId: 'c2', date: '2026-03-19T16:00:00', duration: 60,
    phase: 'debut', status: 'completed', audioFile: null, hasReport: false,
    title: 'Séance #4 — Besoins fondamentaux', paymentMethod: 'especes', paymentReceived: true
  },
  {
    id: 's5', coupleId: 'c3', date: '2026-03-14T10:00:00', duration: 70,
    phase: 'integration', status: 'completed', audioFile: 'session_15.m4a', hasReport: true,
    title: 'Séance #15 — Bilan de mi-parcours', summary: 'Bilan mi-parcours', paymentMethod: 'especes', paymentReceived: true
  },
  {
    id: 's6', coupleId: 'c5', date: '2026-03-19T18:30:00', duration: 90,
    phase: 'debut', status: 'completed', audioFile: null, hasReport: false,
    title: 'Séance #3 — Accueil et écoute', paymentMethod: 'especes', paymentReceived: true
  },
  {
    id: 's7', coupleId: 'c4', date: '2026-03-12T11:00:00', duration: 85,
    phase: 'analyse', status: 'completed', audioFile: 'session_8.m4a', hasReport: true,
    title: 'Séance #8 — Parentalité et équilibre', summary: 'Charge parentale', paymentMethod: 'virement', paymentReceived: false, needsInvoice: true
  },
  {
    id: 's8', coupleId: 'c6', date: '2026-03-19T21:00:00', duration: 60,
    phase: 'integration', status: 'completed', audioFile: null, hasReport: false,
    title: 'Séance #17 — Autonomie et bilan', paymentMethod: 'cheque', paymentReceived: true
  },
  {
    id: 's9', coupleId: 'c2', date: '2026-03-12T16:00:00', duration: 55,
    phase: 'debut', status: 'completed', audioFile: 'session_3_c2.m4a', hasReport: true,
    title: 'Séance #3 — Identifier les schémas', summary: 'Schémas relationnels', paymentMethod: 'cheque', paymentReceived: false
  },
  {
    id: 's10', coupleId: 'c3', date: '2026-03-07T10:00:00', duration: 75,
    phase: 'integration', status: 'completed', audioFile: null, hasReport: false,
    title: 'Séance #14 — Rituels de reconnexion', paymentMethod: 'especes', paymentReceived: false
  },
  {
    id: 's11', coupleId: 'c4', date: '2026-03-05T11:00:00', duration: 80,
    phase: 'analyse', status: 'completed', audioFile: 'session_7_c4.m4a', hasReport: true,
    title: 'Séance #7 — Charge mentale', summary: 'Répartition tâches', paymentMethod: 'virement', paymentReceived: true, needsInvoice: true, invoiceSent: true
  },
  {
    id: 's12', coupleId: 'c6', date: '2026-03-17T21:00:00', duration: 65,
    phase: 'integration', status: 'completed', audioFile: 'session_16_c6.m4a', hasReport: true,
    title: 'Séance #16 — Consolidation acquis', summary: 'Acquis consolidés', paymentMethod: 'cheque', paymentReceived: false, paymentStatus: 'deferred'
  },
  {
    id: 's13', coupleId: 'c2', date: '2026-03-05T16:00:00', duration: 60,
    phase: 'debut', status: 'completed', audioFile: null, hasReport: false,
    title: 'Séance #2 — Écoute et reformulation', paymentMethod: 'especes', paymentReceived: false
  },
  {
    id: 's14', coupleId: 'c1', date: '2026-02-05T14:00:00', duration: 85,
    phase: 'analyse', status: 'completed', audioFile: 'session_10.m4a', hasReport: true,
    title: 'Séance #10 — Attachement et sécurité', summary: 'Attachement secure', paymentMethod: 'virement', paymentReceived: true
  },
  {
    id: 's15', coupleId: 'c4', date: '2026-02-26T11:00:00', duration: 70,
    phase: 'analyse', status: 'completed', audioFile: null, hasReport: false,
    title: 'Séance #6 — Écoute des besoins', paymentMethod: 'cheque', paymentReceived: true
  },
  {
    id: 's16', coupleId: 'c2', date: '2026-03-17T16:00:00', duration: 60,
    phase: 'debut', status: 'cancelled', audioFile: null, hasReport: false,
    title: 'Séance #4 — Annulée par le client', paymentMethod: null
  },
  {
    id: 's17', coupleId: 'c1', date: '2026-03-10T14:00:00', duration: 75,
    phase: 'analyse', status: 'cancelled', audioFile: null, hasReport: false,
    title: 'Séance #12bis — Report pour maladie', paymentMethod: null
  },
  {
    id: 's18', coupleId: 'c3', date: '2026-03-21T10:00:00', duration: 70,
    phase: 'integration', status: 'completed', audioFile: null, hasReport: false,
    title: 'Séance #16 — Consolidation finale', paymentMethod: 'especes', paymentReceived: true
  },
  {
    id: 's19', coupleId: 'c4', date: '2026-03-22T11:00:00', duration: 85,
    phase: 'analyse', status: 'scheduled', audioFile: null, hasReport: false,
    title: 'Séance #9 — Reprise du dialogue', paymentMethod: null
  },
  {
    id: 's20', coupleId: 'c1', date: '2026-03-26T14:00:00', duration: 75,
    phase: 'analyse', status: 'scheduled', audioFile: null, hasReport: false,
    title: 'Séance #14 — Bilan analyse', paymentMethod: null
  },
  {
    id: 's21', coupleId: 'c2', date: '2026-03-28T16:00:00', duration: 60,
    phase: 'debut', status: 'scheduled', audioFile: null, hasReport: false,
    title: 'Séance #5 — Expression des besoins', paymentMethod: null
  },
  {
    id: 's22', coupleId: 'c6', date: '2026-04-02T21:00:00', duration: 60,
    phase: 'integration', status: 'scheduled', audioFile: null, hasReport: false,
    title: 'Séance #18 — Clôture de suivi', paymentMethod: null
  },
  {
    id: 's26', coupleId: 'c1', date: '2026-04-15T09:00:00', duration: 75,
    phase: 'analyse', status: 'scheduled', audioFile: null, hasReport: false,
    title: 'Séance #15 — Évaluation mi-parcours', paymentMethod: null
  },
  {
    id: 's27', coupleId: 'c3', date: '2026-04-15T11:00:00', duration: 60,
    phase: 'integration', status: 'scheduled', audioFile: null, hasReport: false,
    title: 'Séance #17 — Autonomie relationnelle', paymentMethod: null
  },
  {
    id: 's28', coupleId: 'c4', date: '2026-04-15T14:00:00', duration: 85,
    phase: 'analyse', status: 'scheduled', audioFile: null, hasReport: false,
    title: 'Séance #10 — Confiance et engagement', paymentMethod: null
  },
  {
    id: 's29', coupleId: 'c2', date: '2026-04-15T17:00:00', duration: 60,
    phase: 'debut', status: 'scheduled', audioFile: null, hasReport: false,
    title: 'Séance #6 — Attentes et objectifs', paymentMethod: null
  },
  {
    id: 's30', coupleId: 'c6', date: '2026-04-15T21:00:00', duration: 60,
    phase: 'integration', status: 'scheduled', audioFile: null, hasReport: false,
    title: 'Séance #20 — Bilan trimestriel', paymentMethod: null
  }
];

export const mockReports = [
  {
    id: 'r1',
    sessionId: 's2',
    coupleId: 'c1',
    coupleName: 'Dupont',
    sessionNumber: 12,
    date: '2026-03-05',
    phase: 'analyse',
    duration: '1h30',
    narrative: 'La douzième séance a été marquée par une avancée significative dans la compréhension mutuelle des patterns relationnels. Sophie a pu verbaliser pour la première fois son besoin de sécurité émotionnelle, tandis que Thomas a reconnu sa tendance au retrait face au conflit. Le couple commence à identifier le cycle évitement-poursuite qui les caractérise. Un exercice de reformulation CNV a été pratiqué avec succès.',
    themes: ['Communication', 'Gestion de la colère', 'Patterns relationnels'],
    emotionsA: ['Frustration', 'Besoin de reconnaissance', 'Espoir'],
    emotionsB: ['Retrait', 'Peur du conflit', 'Ouverture progressive'],
    patterns: ['Évitement-poursuite (récurrent S#8, S#10, S#12)', 'Thomas se ferme quand Sophie hausse le ton'],
    progress: ['Première verbalisation du besoin de sécurité par Thomas', 'Sophie module sa voix pendant les exercices'],
    vigilance: ['Risque de rechute si stress professionnel chez Thomas', 'Sophie peut interpréter le silence comme du rejet'],
    exercises: ['Exercice d\'écoute active : 15 min/jour, chacun son tour', 'Lettre de gratitude au partenaire pour la prochaine séance'],
    pedagogicalContent: [
      'Explication du cycle d\'évitement-poursuite selon le modèle de Sue Johnson (EFT)',
      'Présentation des 4 étapes de la CNV : observation, sentiment, besoin, demande',
      'Illustration de la différence entre réaction émotionnelle et réponse consciente'
    ]
  },
  {
    id: 'r2',
    sessionId: 's5',
    coupleId: 'c3',
    coupleName: 'Rey',
    sessionNumber: 15,
    date: '2026-03-14',
    phase: 'integration',
    duration: '1h10',
    narrative: 'Séance de bilan très encourageante. Isabelle et Marc démontrent une capacité croissante à appliquer les principes CNV dans leur quotidien. Le rituel de connexion quotidien est maintenu depuis 3 semaines. La phase d\'intégration progresse bien, le couple gagne en autonomie.',
    themes: ['Bilan de mi-parcours', 'Autonomie relationnelle', 'Rituel de connexion'],
    emotionsA: ['Fierté', 'Confiance', 'Sérénité'],
    emotionsB: ['Satisfaction', 'Engagement', 'Gratitude'],
    patterns: ['Pattern d\'écoute active bien intégré', 'Gestion constructive des désaccords'],
    progress: ['Rituel quotidien maintenu 3 semaines', 'Diminution significative des conflits', 'Capacité d\'auto-régulation émotionnelle'],
    vigilance: ['Maintenir la régularité des rituels', 'Anticiper les périodes de stress (vacances)'],
    exercises: ['Continuer le rituel de connexion', 'Pratiquer la CNV en situation de conflit réel'],
    pedagogicalContent: [
      'Rappel de l\'importance des rituels de connexion pour maintenir la qualité relationnelle',
      'Explication du concept d\'autonomie relationnelle : savoir gérer seul les petites tensions'
    ]
  },
  {
    id: 'r3',
    sessionId: 's7',
    coupleId: 'c4',
    coupleName: 'Bernard',
    sessionNumber: 8,
    date: '2026-03-12',
    phase: 'analyse',
    duration: '1h25',
    narrative: 'La séance a exploré en profondeur les enjeux de parentalité. Julie exprime un sentiment de surcharge mentale, tandis que Pierre reconnaît ne pas avoir conscience de l\'ampleur des tâches invisibles. Un travail sur la répartition équitable a été amorcé avec un outil de visualisation concret.',
    themes: ['Parentalité', 'Charge mentale', 'Répartition des tâches'],
    emotionsA: ['Épuisement', 'Sentiment d\'injustice', 'Soulagement d\'être entendue'],
    emotionsB: ['Surprise', 'Culpabilité', 'Volonté de changer'],
    patterns: ['Julie accumule puis explose', 'Pierre minimise involontairement'],
    progress: ['Pierre prend conscience de la charge invisible', 'Premier dialogue constructif sur le sujet'],
    vigilance: ['Ne pas tomber dans le reproche/culpabilisation', 'Valoriser les efforts de Pierre'],
    exercises: ['Planning parental : lister et répartir les tâches sur une semaine type'],
    pedagogicalContent: [
      'Introduction du concept de charge mentale selon le travail d\'Emma',
      'Exercice de visualisation des tâches parentales : la méthode du tableau partagé'
    ]
  }
];

export const mockTherapists = [
  { id: 'therapist-1', name: 'Anne-Chantal Meyer', email: 'anne-chantal.meyer@gmail.com', role: 'admin', couplesCount: 20, sessionsCount: 147, lastActive: '2026-03-19', status: 'active' },
  { id: 'therapist-2', name: 'Anne Moreau', email: 'anne.moreau@gmail.com', role: 'therapist', couplesCount: 12, sessionsCount: 89, lastActive: '2026-03-18', status: 'active' },
  { id: 'therapist-3', name: 'Catherine Petit', email: 'c.petit@gmail.com', role: 'therapist', couplesCount: 8, sessionsCount: 45, lastActive: '2026-03-15', status: 'active' },
  { id: 'therapist-4', name: 'Lucie Fontaine', email: 'lucie.f@gmail.com', role: 'therapist', couplesCount: 0, sessionsCount: 0, lastActive: '2026-03-10', status: 'inactive' },
  { id: 'therapist-5', name: 'Sophie Blanc', email: 'sophie.blanc@gmail.com', role: 'therapist', couplesCount: 15, sessionsCount: 102, lastActive: '2026-03-19', status: 'active' }
];

export function getCoupleName(couple) {
  const fnA = (couple.partnerA.firstName || '').trim() || '...';
  if (!couple.partnerB) return `${fnA} ${couple.partnerA.lastName.toUpperCase()}`;
  const fnB = (couple.partnerB.firstName || '').trim() || '...';
  if (couple.partnerA.lastName.toLowerCase() !== couple.partnerB.lastName.toLowerCase()) {
    return `${fnA} ${couple.partnerA.lastName.toUpperCase()} et ${fnB} ${couple.partnerB.lastName.toUpperCase()}`;
  }
  return `${fnA} et ${fnB} ${couple.partnerA.lastName.toUpperCase()}`;
}

export function getCoupleInitials(couple) {
  if (!couple?.partnerA) return '?';
  const fnA = (couple.partnerA.firstName || '').trim();
  const lnA = (couple.partnerA.lastName || '').trim();
  if (!couple.partnerB) {
    const init = fnA && lnA ? `${fnA[0]}${lnA[0]}` : lnA ? lnA[0] : fnA ? fnA[0] : '?';
    return init.toUpperCase();
  }
  const fnB = (couple.partnerB.firstName || '').trim();
  const lnB = (couple.partnerB.lastName || '').trim();
  const initA = fnA ? fnA[0] : lnA ? lnA[0] : '?';
  const initB = fnB ? fnB[0] : lnB ? lnB[0] : '?';
  return `${initA}${initB}`.toUpperCase();
}

export const therapyPhases = [
  { key: 'debut', label: 'Début', color: '#2B6CB0', bg: '#EBF8FF' },
  { key: 'analyse', label: 'Analyse', color: '#E67E22', bg: '#FFF3E0' },
  { key: 'integration', label: 'Intégration', color: '#276749', bg: '#F0FFF4' },
  { key: 'bilan_final', label: 'Bilan final', color: '#6B46C1', bg: '#FAF5FF' }
];

export const defaultTherapyConfig = {
  totalSessions: 20
};

export function getPhaseLabel(phase) {
  if (phase === 'prospect') return 'Prospect';
  if (phase === 'bilan_final') return 'Bilan final';
  const found = therapyPhases.find(p => p.key === phase);
  return found ? found.label : phase;
}

export const prospectStages = [
  { key: 'first_contact', label: 'Premier contact', percent: 25, color: '#D6BCFA' },
  { key: 'discovery_call', label: 'Appel découverte', percent: 50, color: '#B794F4' },
  { key: 'appointment_set', label: 'RDV découverte fixé', percent: 75, color: '#9F7AEA' },
  { key: 'converted', label: 'Converti', percent: 100, color: '#6B46C1' }
];

export const recruitmentSources = [
  { key: 'website', label: 'Site web' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'referral', label: 'Parrainage' },
  { key: 'email', label: 'Email' },
  { key: 'social', label: 'Réseaux sociaux' }
];

export const sessionRates = {
  couple: 75,
  individual: 60
};

export function getProspectStageInfo(stage) {
  return prospectStages.find(s => s.key === stage) || prospectStages[0];
}

export function getStatusLabel(status) {
  const labels = { active: 'Actif', inactive: 'Inactif' };
  return labels[status] || status;
}

// Computed client type — therapeutic context with auto Couple↔Famille based on children
export function getClientType(client) {
  const hasChildren = client.children && client.children.length > 0;
  const hasPartnerB = !!client.partnerB;
  // Respect explicitly set type first
  if (client.type === 'family') return 'family';
  if (client.type === 'individual' && !hasPartnerB) return 'individual';
  // Auto-detect from data
  if (hasChildren) return 'family';
  if (hasPartnerB) return 'couple';
  return client.type || 'individual';
}

export const clientTypeLabels = { individual: 'Individuel', couple: 'Couple', family: 'Famille' };

export function getComputedStatus(couple) {
  // Manual override always takes priority (both active and inactive)
  if (couple.status === 'inactive') return 'inactive';
  if (couple.status === 'active') return 'active';
  // Auto-calculate: if has a future appointment, considered active
  if (couple.nextSession && new Date(couple.nextSession) > new Date()) return 'active';
  if (!couple.lastSession && !couple.startDate) return 'active';
  const refDate = new Date(couple.lastSession || couple.startDate);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return refDate < threeMonthsAgo ? 'inactive' : 'active';
}

export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function formatRelativeDate(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return 'il y a quelques minutes';
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays === 1) return 'hier';
  if (diffDays < 7) return `il y a ${diffDays}j`;
  return formatDate(dateStr);
}

export function getTodaySessions(sessions, couples) {
  const today = new Date().toISOString().split('T')[0];
  return sessions
    .filter(s => s.date.startsWith(today) || s.date.startsWith('2026-03-19'))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({
      ...s,
      couple: couples.find(c => c.id === s.coupleId)
    }));
}
