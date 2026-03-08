-- Auto-GC: Initial Schema — The Project Digital Twin
-- Run against Supabase PostgreSQL

-- Enums
CREATE TYPE project_status AS ENUM ('planning', 'active', 'paused', 'completed', 'archived');
CREATE TYPE milestone_status AS ENUM ('not_started', 'in_progress', 'blocked', 'review', 'completed');
CREATE TYPE sub_project_status AS ENUM ('invited', 'bid_submitted', 'awarded', 'active', 'completed');
CREATE TYPE comm_channel AS ENUM ('sms', 'voice', 'email', 'qr_upload', 'manual');
CREATE TYPE comm_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE comm_processing_status AS ENUM ('pending', 'processing', 'processed', 'failed');
CREATE TYPE media_source AS ENUM ('qr_upload', 'sms_attachment', 'dashboard_upload');
CREATE TYPE agent_type AS ENUM ('orchestrator', 'comm', 'vision', 'logistics', 'client_portal');

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255),
    client_phone VARCHAR(50),
    twilio_phone_number VARCHAR(50),
    qr_code_url TEXT,
    scope_of_work TEXT,
    status project_status DEFAULT 'planning',
    total_budget DOUBLE PRECISION,
    spent_budget DOUBLE PRECISION DEFAULT 0.0,
    start_date TIMESTAMPTZ,
    target_end_date TIMESTAMPTZ,
    owner_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Milestones (Gantt nodes)
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trade VARCHAR(100),
    percent_complete DOUBLE PRECISION DEFAULT 0.0,
    status milestone_status DEFAULT 'not_started',
    sort_order INTEGER DEFAULT 0,
    planned_start TIMESTAMPTZ,
    planned_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    lead_time_days INTEGER,
    budgeted_cost DOUBLE PRECISION,
    actual_cost DOUBLE PRECISION DEFAULT 0.0,
    vision_verified BOOLEAN DEFAULT false,
    vision_confidence DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subcontractors
CREATE TABLE subcontractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255),
    trade VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Project-Sub junction
CREATE TABLE project_subcontractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
    status sub_project_status DEFAULT 'invited',
    bid_amount DOUBLE PRECISION,
    contract_amount DOUBLE PRECISION,
    paid_amount DOUBLE PRECISION DEFAULT 0.0,
    stripe_account_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Communications (Agentic Inbox source)
CREATE TABLE communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    channel comm_channel NOT NULL,
    direction comm_direction DEFAULT 'inbound',
    from_number VARCHAR(50),
    to_number VARCHAR(50),
    from_name VARCHAR(255),
    raw_body TEXT,
    voice_recording_url TEXT,
    transcription TEXT,
    parsed_intent VARCHAR(100),
    parsed_data JSONB,
    agent_response TEXT,
    processing_status comm_processing_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Media (site photos, documents)
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES milestones(id),
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_name VARCHAR(255),
    source media_source DEFAULT 'dashboard_upload',
    uploaded_by_phone VARCHAR(50),
    vision_analysis JSONB,
    vision_match_score DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent Logs (The Black Box)
CREATE TABLE agent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    agent_type agent_type NOT NULL,
    event VARCHAR(100) NOT NULL,
    detail TEXT,
    reasoning_trace JSONB,
    input_data JSONB,
    output_data JSONB,
    duration_ms DOUBLE PRECISION,
    tokens_used INTEGER,
    communication_id UUID,
    media_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_milestones_project ON milestones(project_id);
CREATE INDEX idx_communications_project ON communications(project_id);
CREATE INDEX idx_communications_status ON communications(processing_status);
CREATE INDEX idx_communications_from ON communications(from_number);
CREATE INDEX idx_media_project ON media(project_id);
CREATE INDEX idx_agent_logs_project ON agent_logs(project_id);
CREATE INDEX idx_agent_logs_type ON agent_logs(agent_type);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_twilio ON projects(twilio_phone_number);
CREATE INDEX idx_subcontractors_phone ON subcontractors(phone);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER milestones_updated_at BEFORE UPDATE ON milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
