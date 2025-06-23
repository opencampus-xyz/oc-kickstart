export const ACHIEVEMENT_TYPES = [
  "Achievement",
  "ApprenticeshipCertificate",
  "Assessment",
  "Assignment",
  "AssociateDegree",
  "Award",
  "Badge",
  "BachelorDegree",
  "Certificate",
  "CertificateOfCompletion",
  "Certification",
  "CommunityService",
  "Competency",
  "Course",
  "CoCurricular",
  "Degree",
  "Diploma",
  "DoctoralDegree",
  "Fieldwork",
  "GeneralEducationDevelopment",
  "JourneymanCertificate",
  "LearningProgram",
  "License",
  "Membership",
  "ProfessionalDoctorate",
  "QualityAssuranceCredential",
  "MasterCertificate",
  "MasterDegree",
  "MicroCredential",
  "ResearchDoctorate",
  "SecondarySchoolDiploma",
];

export const LISTING_TRIGGER_MODES = ["manual", "auto"];

export const UserListingStatus = {
    PENDING: 'pending',
    DECLINED: 'declined',
    APPROVED: 'approved',
    COMPLETED: 'completed'
};

export const USER_LISTING_STATUSES = [
    ...Object.values(UserListingStatus),
    "all"
];

// Database-related constants
export const ListingTriggerMode = {
    MANUAL: 'manual',
    AUTO: 'auto'
};

export const ListingStatus = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    DELETED: 'deleted'
};

export const VcIssueJobStatus = {
    PENDING: 'pending',
    SUCCESS: 'success',
    FAILED: 'failed'
};
