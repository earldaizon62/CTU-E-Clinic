CREATE DATABASE IF NOT EXISTS eclinic;
USE eclinic;

CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    course VARCHAR(100),
    section VARCHAR(50)
);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Store hashed passwords
    role ENUM('admin', 'student') NOT NULL,
    student_id VARCHAR(50),
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE SET NULL
);

CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    concern TEXT,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

CREATE TABLE queries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('Pending', 'Resolved') DEFAULT 'Pending',
    response TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

-- Insert default admin user (password: admin1232026 hashed)
INSERT INTO users (username, password, role) VALUES ('admin', '$2y$10$Li7MeQmdGV9/kVuzzVb03ua.sCG1ULxDaxKJ0bJIT/wvqJG26VWjK', 'admin');

-- Insert sample students
INSERT INTO students (name, student_id, course, section) VALUES
('Earl Jasper Moniño', '8240425', 'BSIT', '2A'),
('Mark Francis Tumlad', '8241067', 'BSIT', '2A'),
('Trisha Bacia', '8240002', 'BSIT', '2A');