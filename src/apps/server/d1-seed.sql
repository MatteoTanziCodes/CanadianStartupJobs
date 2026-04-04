
INSERT OR IGNORE INTO provinces (name, code) VALUES
 ('Ontario','ON'),
 ('British Columbia','BC'),
 ('Alberta','AB'),
 ('Quebec','QC'),
 ('Nova Scotia','NS'),
 ('New Brunswick','NB'),
 ('Manitoba','MB'),
 ('Saskatchewan','SK'),
 ('Prince Edward Island','PE'),
 ('Newfoundland and Labrador','NL');

INSERT OR IGNORE INTO job_types (name) VALUES
 ('Full-time'),
 ('Part-time'),
 ('Contract'),
 ('Internship');

INSERT OR IGNORE INTO experience_levels (name) VALUES
 ('Entry'),
 ('Intermediate'),
 ('Senior'),
 ('Lead');

INSERT OR IGNORE INTO industries (name) VALUES
 ('Software'),
 ('Fintech'),
 ('AI'),
 ('Climate'),
 ('Healthcare'),
 ('Consumer');

INSERT OR IGNORE INTO roles (name) VALUES
 ('Engineering'),
 ('Design'),
 ('Product'),
 ('Marketing'),
 ('Sales'),
 ('Operations');

INSERT OR IGNORE INTO team_sizes (name) VALUES
 ('1-10'),
 ('11-50'),
 ('51-200'),
 ('201+');

INSERT OR IGNORE INTO raising_stages (name) VALUES
 ('Bootstrapped'),
 ('Pre-seed'),
 ('Seed'),
 ('Series A'),
 ('Series B+');
