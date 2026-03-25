// Mock data for the application

  
  export const mockReclamations = [
    { id: "rc1", médécinId: "1", titre: "Problème d'accès au système", description: "Je n'arrive pas à accéder à mes rapports du mois dernier.", statut: "traitée", réponse: "Le problème a été résolu. Vos rapports sont maintenant accessibles.", date: "2024-01-10" },
    { id: "rc2", médécinId: "1", titre: "Lenteur de transcription", description: "Le module de transcription est très lent depuis 3 jours.", statut: "en_cours", réponse: "", date: "2024-01-14" },
    { id: "rc3", médécinId: "1", titre: "Erreur lors de l'export CSV", description: "Le téléchargement CSV ne fonctionne pas.", statut: "en_attente", réponse: "", date: "2024-01-15" },
  ];
  
  export const mockMédecins = [
    { id: "1", nom: "Martin", prénom: "Sophie", email: "medecin@radio.fr", rôle: "médecin", statut: "validé", dateInscription: "2023-06-15" },
    { id: "4", nom: "Leroy", prénom: "Marie", email: "attente@radio.fr", rôle: "médecin", statut: "en_attente", dateInscription: "2024-01-14" },
    { id: "5", nom: "Moreau", prénom: "Pierre", email: "pierre@radio.fr", rôle: "médecin", statut: "en_attente", dateInscription: "2024-01-15" },
    { id: "6", nom: "Petit", prénom: "Isabelle", email: "isabelle@radio.fr", rôle: "médecin", statut: "validé", dateInscription: "2023-09-20" },
    { id: "7", nom: "Laurent", prénom: "Thomas", email: "thomas@radio.fr", rôle: "médecin", statut: "refusé", dateInscription: "2023-12-01" },
  ];
  
  export const mockAdmins = [
    { id: "a1", nom: "Dupont", prénom: "Jean", email: "admin@radio.fr", rôle: "admin", statut: "validé", dateInscription: "2023-01-10" },
    { id: "a2", nom: "Fontaine", prénom: "Claire", email: "claire.admin@radio.fr", rôle: "admin", statut: "en_attente", dateInscription: "2024-01-12" },
    { id: "a3", nom: "Bernard", prénom: "Lucas", email: "it@radio.fr", rôle: "adminIT", statut: "validé", dateInscription: "2023-01-05" },
    { id: "a4", nom: "Roux", prénom: "Émilie", email: "emilie.it@radio.fr", rôle: "adminIT", statut: "en_attente", dateInscription: "2024-01-16" },
  ];
  
  export const mockCSVLines = [
    { ID_Exam: "00000001", id_médecin: "1", nom_médecin: "Dr. Sophie Martin", date: "2024-01-15", heure: "09:30", transcription: "Radiographie thoracique: poumons clairs..." },
    { ID_Exam: "00000002", id_médecin: "1", nom_médecin: "Dr. Sophie Martin", date: "2024-01-15", heure: "10:45", transcription: "IRM cérébrale: pas de lésion ischémique..." },
    { ID_Exam: "00000003", id_médecin: "1", nom_médecin: "Dr. Sophie Martin", date: "2024-01-14", heure: "11:00", transcription: "Scanner thoraco-abdomino-pelvien: résultats..." },
    { ID_Exam: "00000004", id_médecin: "1", nom_médecin: "Dr. Sophie Martin", date: "2024-01-13", heure: "16:15", transcription: "Radiographie du bassin: hanches symétriques..." },
  ];
  
  export const mockRapportTranscription = `indication: le patient présente des céphalées persistantes et progressivement croissantes depuis trois semaines associées à des épisodes de vertiges intermittents et une vision floue occasionnelle le patient nie tout antécédent de traumatisme crânien récent ou de chutes mais signale une augmentation du stress et des troubles du sommeil il se plaint également de nausées légères notamment en début de matinée sans vomissements ses antécédents médicaux comprennent une hypertension artérielle actuellement traitée sans antécédent connu de troubles neurologiques ou d épisodes similaires antérieurs

resultat: aucune hémorragie intracrânienne aiguë ni collection liquidienne extra axiale n est identifiée le système ventriculaire est de taille et de morphologie normales sans signe d hydrocéphalie il n existe pas de déviation de la ligne médiane ni d effet de masse les sillons corticaux sont bien préservés une petite zone hypodense est notée dans la région pariétale droite pouvant correspondre à une lésion ischémique chronique ou à un ancien infarctus les structures de la fosse postérieure incluant le cervelet et le tronc cérébral apparaissent normales aucun rehaussement anormal n est observé après injection de produit de contraste les os du crâne sont intacts et les sinus visualisés sont libres

conclusion: aucune anomalie intracrânienne aiguë n est identifiée les résultats sont les plus compatibles avec une lésion ischémique chronique du lobe pariétal droit pouvant être corrélée aux antécédents cliniques du patient une surveillance clinique régulière est recommandée et une évaluation complémentaire par IRM pourrait être envisagée en cas de persistance ou d aggravation des symptômes`;

  export const generateChartData = (days = 30) => {
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        date: date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        rapports: Math.floor(Math.random() * 12) + 1,
        transcriptions: Math.floor(Math.random() * 15) + 2,
        inscriptions: Math.floor(Math.random() * 3),
        réclamations: Math.floor(Math.random() * 2),
      };
    });
  };
  