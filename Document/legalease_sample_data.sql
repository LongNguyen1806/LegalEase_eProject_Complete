USE legalease_db;

DELETE FROM roles;

INSERT INTO roles (roleid, rolename) 
VALUES 
(1, 'admin'),
(2, 'lawyer'),
(3, 'customer');

DELETE FROM locations;

INSERT INTO locations (locid, cityname) 
VALUES 
(1, 'District 1, Ho Chi Minh City'),
(2, 'District 2, Ho Chi Minh City'),
(3, 'District 3, Ho Chi Minh City'),
(4, 'District 4, Ho Chi Minh City'),
(5, 'District 5, Ho Chi Minh City'),
(6, 'District 6, Ho Chi Minh City'),
(7, 'District 7, Ho Chi Minh City'),
(8, 'District 8, Ho Chi Minh City'),
(9, 'District 9, Ho Chi Minh City'),
(10, 'District 10, Ho Chi Minh City'),
(11, 'District 11, Ho Chi Minh City'),
(12, 'District 12, Ho Chi Minh City'),
(13, 'Phu Nhuan District, Ho Chi Minh City'),
(14, 'Tan Binh District, Ho Chi Minh City'),
(15, 'Go Vap District, Ho Chi Minh City'),
(16, 'Tan Phu District, Ho Chi Minh City'),
(17, 'Binh Thanh District, Ho Chi Minh City'),
(18, 'Thu Duc City');

DELETE FROM specializations;

INSERT INTO specializations (specid, specname) 
VALUES 
(1, 'Civil Law'),
(2, 'Consumer Protection Law'),
(3, 'Marriage and Family Law'),
(4, 'Road Traffic Law'),
(5, 'Residence Law'),
(6, 'Civil Status Law'),
(7, 'Domestic Violence Prevention Law'),
(8, 'Complaint Law'),
(9, 'Criminal Law'),
(10, 'IT and Cybersecurity Law'),
(11, 'Commercial Law');

DELETE FROM subscription_plans;

INSERT INTO subscription_plans (planid, planname, price) 
VALUES 
(1, 'Free', 0),
(2, 'Monthly Pro', 100),
(3, 'Yearly Premium', 1100);

DELETE FROM content_management;

INSERT INTO content_management (type, title, body, created_at, updated_at) 
VALUES 
(
    'FAQ', 
    'How do I book an appointment?', 
    'You need to log in to your customer account and select an available time slot from the lawyer schedule.', 
    NOW(), 
    NOW()
),
(
    'News', 
    'LegalEase launches lawyer connection platform', 
    'LegalEase helps clients find the right lawyer quickly and efficiently.', 
    NOW(), 
    NOW()
),
(
    'Terms of Service', 
    'Privacy Policy', 
    'We are committed to protecting the personal data and privacy of our users.', 
    NOW(), 
    NOW()
);

DELETE FROM users;

INSERT INTO users (userid, email, password, roleid, isactive, created_at, updated_at)
VALUES
(1, 'admin@legalease.vn', '$2y$12$mx8hmTMpdtGNX007Oy.eu.s86l6550SG3drGTItMmYGbawTEB.5ou', 1, 1, NOW(), NOW()),
(2, 'lawyer1@example.com', '$2y$12$mx8hmTMpdtGNX007Oy.eu.s86l6550SG3drGTItMmYGbawTEB.5ou', 2, 1, NOW(), NOW()),
(3, 'lawyer2@example.com', '$2y$12$mx8hmTMpdtGNX007Oy.eu.s86l6550SG3drGTItMmYGbawTEB.5ou', 2, 1, NOW(), NOW()),
(4, 'lawyer3@example.com', '$2y$12$mx8hmTMpdtGNX007Oy.eu.s86l6550SG3drGTItMmYGbawTEB.5ou', 2, 1, NOW(), NOW()),
(5, 'lawyer4@example.com', '$2y$12$mx8hmTMpdtGNX007Oy.eu.s86l6550SG3drGTItMmYGbawTEB.5ou', 2, 1, NOW(), NOW()),
(6, 'lawyer5@example.com', '$2y$12$mx8hmTMpdtGNX007Oy.eu.s86l6550SG3drGTItMmYGbawTEB.5ou', 2, 1, NOW(), NOW()),
(7, 'lawyer6@example.com', '$2y$12$mx8hmTMpdtGNX007Oy.eu.s86l6550SG3drGTItMmYGbawTEB.5ou', 2, 1, NOW(), NOW()),
(8, 'customer1@example.com', '$2y$12$mx8hmTMpdtGNX007Oy.eu.s86l6550SG3drGTItMmYGbawTEB.5ou', 3, 1, NOW(), NOW()),
(9, 'customer2@example.com', '$2y$12$mx8hmTMpdtGNX007Oy.eu.s86l6550SG3drGTItMmYGbawTEB.5ou', 3, 1, NOW(), NOW()),
(10, 'customer3@example.com', '$2y$12$mx8hmTMpdtGNX007Oy.eu.s86l6550SG3drGTItMmYGbawTEB.5ou', 3, 1, NOW(), NOW()),
(11, 'customer4@example.com', '$2y$12$mx8hmTMpdtGNX007Oy.eu.s86l6550SG3drGTItMmYGbawTEB.5ou', 3, 1, NOW(), NOW()),
(12, 'customer5@example.com', '$2y$12$mx8hmTMpdtGNX007Oy.eu.s86l6550SG3drGTItMmYGbawTEB.5ou', 3, 1, NOW(), NOW()),
(13, 'customer6@example.com', '$2y$12$mx8hmTMpdtGNX007Oy.eu.s86l6550SG3drGTItMmYGbawTEB.5ou', 3, 1, NOW(), NOW());

DELETE FROM lawyer_offices;
DELETE FROM lawyer_profiles;

INSERT INTO lawyer_profiles (lawyerid, fullname, phonenumber, experienceyears, bio, isverified)
VALUES
(2, 'Andrew Nguyen', '0980000001', 5, 'Hello, I am Attorney Andrew Nguyen, specializing in providing comprehensive legal solutions.', 1),
(3, 'Beatrice Tran', '0980000002', 6, 'Hello, I am Attorney Beatrice Tran, specializing in providing comprehensive legal solutions.', 1),
(4, 'Cedric Le', '0980000003', 7, 'Hello, I am Attorney Cedric Le, specializing in providing comprehensive legal solutions.', 1),
(5, 'Dominic Pham', '0980000004', 8, 'Hello, I am Attorney Dominic Pham, specializing in providing comprehensive legal solutions.', 1),
(6, 'Harrison Hoang', '0980000005', 9, 'Hello, I am Attorney Harrison Hoang, specializing in providing comprehensive legal solutions.', 1),
(7, 'Hubert Truong', '0980000006', 10, 'Hello, I am Attorney Hubert Truong, specializing in providing comprehensive legal solutions.', 0);

INSERT INTO lawyer_offices (lawyerid, locid, latitude, longitude, addressdetail)
VALUES
(2, 1, 10.771111, 106.693389, '36 Nguyen Thi Nghia St'),
(3, 5, 10.757361, 106.673778, '01 An Duong Vuong St'),
(4, 7, 10.726250, 106.708806, '101 Nguyen Duc Canh St'),
(5, 13, 10.793250, 106.669972, '188A Le Van Sy St'),
(6, 15, 10.843139, 106.642139, '1180 Quang Trung St'),
(7, 1, 10.763665, 106.660194, '140 Ly Thuong Kiet St');

DELETE FROM customer_profiles;

INSERT INTO customer_profiles (customerid, fullname, phonenumber)
VALUES
(8, 'Customer 1', '0910000001'),
(9, 'Customer 2', '0910000002'),
(10, 'Customer 3', '0910000003'),
(11, 'Customer 4', '0910000004'),
(12, 'Customer 5', '0910000005'),
(13, 'Customer 6', '0910000006');

DELETE FROM lawyer_achievements;

INSERT INTO lawyer_achievements (lawyerid, title, created_at, updated_at)
VALUES 
(2, 'Outstanding Lawyer of the Year 2025', NOW(), NOW()),
(3, 'Outstanding Lawyer of the Year 2025', NOW(), NOW()),
(4, 'Outstanding Lawyer of the Year 2025', NOW(), NOW()),
(5, 'Outstanding Lawyer of the Year 2025', NOW(), NOW()),
(6, 'Outstanding Lawyer of the Year 2025', NOW(), NOW()),
(7, 'Outstanding Lawyer of the Year 2025', NOW(), NOW());

DELETE FROM lawyer_verifications;

INSERT INTO lawyer_verifications (lawyerid, idcardnumber, licensenumber, documentimage, status, created_at, updated_at)
VALUES 
(2, '00109000002', 'LAW-2022', 'default_license.jpg', 'Approved', NOW(), NOW()),
(3, '00109000003', 'LAW-2023', 'default_license.jpg', 'Approved', NOW(), NOW()),
(4, '00109000004', 'LAW-2024', 'default_license.jpg', 'Approved', NOW(), NOW()),
(5, '00109000005', 'LAW-2025', 'default_license.jpg', 'Approved', NOW(), NOW()),
(6, '00109000006', 'LAW-2026', 'default_license.jpg', 'Approved', NOW(), NOW()),
(7, '00109000007', 'LAW-2027', 'default_license.jpg', 'Approved', NOW(), NOW());

DELETE FROM lawyer_specialties;

INSERT INTO lawyer_specialties (lawyerid, specid, created_at, updated_at)
VALUES 
(2, 2, NOW(), NOW()), (2, 4, NOW(), NOW()),
(3, 2, NOW(), NOW()), (3, 4, NOW(), NOW()),
(4, 2, NOW(), NOW()), (4, 4, NOW(), NOW()),
(5, 2, NOW(), NOW()), (5, 4, NOW(), NOW()),
(6, 2, NOW(), NOW()), (6, 4, NOW(), NOW()),
(7, 2, NOW(), NOW()), (7, 4, NOW(), NOW());

DELETE FROM lawyer_subscriptions;

INSERT INTO lawyer_subscriptions (lawyerid, planid, startdate, enddate, status, created_at, updated_at)
VALUES 
(2, 3, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'Active', NOW(), NOW()),
(3, 3, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'Active', NOW(), NOW()),
(4, 3, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'Active', NOW(), NOW()),
(5, 3, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'Active', NOW(), NOW()),
(6, 2, NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), 'Active', NOW(), NOW()),
(7, 2, NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), 'Active', NOW(), NOW());

DELETE FROM lawyer_earnings;

INSERT INTO lawyer_earnings (lawyerid, totalmatches, totalcommissionpaid, created_at, updated_at)
VALUES 
(2, 1, 200.00, NOW(), NOW()),
(3, 1, 200.00, NOW(), NOW()),
(4, 1, 200.00, NOW(), NOW()),
(5, 0, 0.00, NOW(), NOW());

DELETE FROM service_price_ranges;

INSERT INTO service_price_ranges (specid, minprice, maxprice, created_at, updated_at)
VALUES 
(1, 200.00, 300.00, NOW(), NOW()),
(2, 300.00, 400.00, NOW(), NOW()),
(3, 300.00, 600.00, NOW(), NOW()),
(4, 400.00, 700.00, NOW(), NOW()),
(5, 380.00, 500.00, NOW(), NOW()),
(6, 600.00, 1200.00, NOW(), NOW()),
(7, 700.00, 900.00, NOW(), NOW()),
(8, 500.00, 1000.00, NOW(), NOW()),
(9, 100.00, 200.00, NOW(), NOW()),
(10, 800.00, 1500.00, NOW(), NOW()),
(11, 600.00, 1200.00, NOW(), NOW());

DELETE FROM qa_answers;
DELETE FROM qa_questions;

INSERT INTO qa_questions (questionid, customerid, title, content, isapproved, created_at, updated_at)
VALUES 
(1, 8, 'Child Custody in Vietnam', 'How is child custody decided in Vietnam?', 1, NOW(), NOW()),
(2, 9, 'Child Custody in Vietnam', 'How is child custody decided in Vietnam?', 1, NOW(), NOW()),
(3, 10, 'Child Custody in Vietnam', 'How is child custody decided in Vietnam?', 1, NOW(), NOW()),
(4, 11, 'Child Custody in Vietnam', 'How is child custody decided in Vietnam?', 1, NOW(), NOW()),
(5, 12, 'Child Custody in Vietnam', 'How is child custody decided in Vietnam?', 1, NOW(), NOW()),
(6, 13, 'Child Custody in Vietnam', 'How is child custody decided in Vietnam?', 1, NOW(), NOW());

INSERT INTO qa_answers (questionid, lawyerid, content, isapproved, created_at, updated_at)
VALUES 
(1, 2, 'The court evaluates the child’s best interests by considering factors such as the child’s age, current living conditions, emotional stability, and each parent’s ability to provide proper care and support.', 1, NOW(), NOW()),
(2, 3, 'The court evaluates the child’s best interests by considering factors such as the child’s age, current living conditions, emotional stability, and each parent’s ability to provide proper care and support.', 1, NOW(), NOW()),
(3, 4, 'The court evaluates the child’s best interests by considering factors such as the child’s age, current living conditions, emotional stability, and each parent’s ability to provide proper care and support.', 1, NOW(), NOW()),
(4, 5, 'The court evaluates the child’s best interests by considering factors such as the child’s age, current living conditions, emotional stability, and each parent’s ability to provide proper care and support.', 1, NOW(), NOW()),
(5, 6, 'The court evaluates the child’s best interests by considering factors such as the child’s age, current living conditions, emotional stability, and each parent’s ability to provide proper care and support.', 1, NOW(), NOW()),
(6, 7, 'The court evaluates the child’s best interests by considering factors such as the child’s age, current living conditions, emotional stability, and each parent’s ability to provide proper care and support.', 1, NOW(), NOW());

DELETE FROM appointments;
DELETE FROM availability_slots;

INSERT INTO availability_slots (slotid, lawyerid, availabledate, starttime, endtime, isavailable, created_at, updated_at)
VALUES 
(1, 2, DATE_SUB(CURDATE(), INTERVAL 2 DAY), '08:00:00', '12:00:00', 1, NOW(), NOW()), 
(2, 2, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '08:00:00', '17:00:00', 1, NOW(), NOW()), 
(3, 3, DATE_SUB(CURDATE(), INTERVAL 2 DAY), '13:00:00', '17:00:00', 1, NOW(), NOW()), 
(4, 4, CURDATE(), '08:00:00', '12:00:00', 1, NOW(), NOW()),                         
(5, 5, CURDATE(), '13:00:00', '17:00:00', 1, NOW(), NOW());                         

INSERT INTO appointments (slotid, customerid, lawyerid, status, packagename, duration, starttime, commissionfee, note, created_at, updated_at)
VALUES 
(1, 8, 2, 'Completed', 'Legal Analysis', 120, '08:00:00', 300.00, 'I need legal advice on fast-track uncontested divorce procedures.', NOW(), NOW()),
(3, 9, 3, 'Completed', 'Legal Express', 60, '14:00:00', 220.00, 'Requesting a lawyer to review this real estate purchase agreement for potential legal risks.', NOW(), NOW()),
(4, 10, 4, 'Completed', 'Legal Analysis', 120, '09:00:00', 300.00, 'Consultation regarding family inheritance and property disputes.', NOW(), NOW()),
(5, 11, 5, 'Pending', 'Legal Express', 60, '13:00:00', 180.00, 'I would like to learn about the procedures for establishing a single-member limited liability company.', NOW(), NOW()),
(2, 8, 2, 'Confirmed', 'Legal Express', 60, '10:00:00', 150.00, 'Follow-up consultation regarding child custody rights after divorce.', NOW(), NOW());

DELETE FROM reviews;

INSERT INTO reviews (appointid, rating, title, relationship, comment, created_at, updated_at)
VALUES 
(1, 5, 'Very satisfied with the service', 'consulted', 'The lawyer provided clear and very professional advice.', NOW(), NOW()),
(2, 5, 'Dedicated lawyer', 'hired', 'Serious work ethic and fast resolution.', NOW(), NOW()),
(3, 5, 'Exceeded expectations', 'consulted', 'I am completely satisfied with the results achieved.', NOW(), NOW()),
(4, 5, 'Very satisfied with the service', 'hired', 'The lawyer provided clear and very professional advice.', NOW(), NOW()),
(5, 5, 'Dedicated lawyer', 'consulted', 'Serious work ethic and fast resolution.', NOW(), NOW());

DELETE FROM payments_invoices;

INSERT INTO payments_invoices (userid, appointid, subid, transactionno, paymentmethod, amount, refundamount, status, createdat, created_at, updated_at)
VALUES 
(2, NULL, 1, 'SUB-YEAR-002', 'Credit Card', 1100.00, 0, 'Success', DATE_SUB(NOW(), INTERVAL 5 DAY), NOW(), NOW()),
(6, NULL, 5, 'SUB-MONTH-006', 'ATM', 100.00, 0, 'Success', DATE_SUB(NOW(), INTERVAL 2 DAY), NOW(), NOW()),
(8, 1, NULL, 'BOOK-VNP-001', 'E-Wallet', 200.00, 0, 'Success', DATE_SUB(NOW(), INTERVAL 2 DAY), NOW(), NOW()),
(9, 2, NULL, 'BOOK-CC-002', 'Credit Card', 200.00, 0, 'Success', DATE_SUB(NOW(), INTERVAL 2 DAY), NOW(), NOW()),
(10, 3, NULL, 'BOOK-MOMO-003', 'Momo', 200.00, 0, 'Success', DATE_SUB(NOW(), INTERVAL 12 HOUR), NOW(), NOW()),
(11, 4, NULL, 'BOOK-ATM-004', 'ATM', 200.00, 0, 'Success', DATE_SUB(NOW(), INTERVAL 5 HOUR), NOW(), NOW()),
(8, 5, NULL, 'BOOK-ZALO-005', 'ZaloPay', 200.00, 0, 'Success', DATE_SUB(NOW(), INTERVAL 1 HOUR), NOW(), NOW());

DELETE FROM notifications;

INSERT INTO notifications (userid, message, type, issentemail, sentat, isread, created_at, updated_at)
VALUES 
(2, 'Welcome to LegalEase.', 'System', 0, NOW(), 0, NOW(), NOW()),
(3, 'Welcome to LegalEase.', 'System', 0, NOW(), 0, NOW(), NOW()),
(4, 'Welcome to LegalEase.', 'System', 0, NOW(), 0, NOW(), NOW()),
(5, 'Welcome to LegalEase.', 'System', 0, NOW(), 0, NOW(), NOW()),
(6, 'Welcome to LegalEase.', 'System', 0, NOW(), 0, NOW(), NOW()),
(7, 'Welcome to LegalEase.', 'System', 0, NOW(), 0, NOW(), NOW()),
(8, 'Welcome to LegalEase.', 'System', 0, NOW(), 0, NOW(), NOW()),
(9, 'Welcome to LegalEase.', 'System', 0, NOW(), 0, NOW(), NOW()),
(10, 'Welcome to LegalEase.', 'System', 0, NOW(), 0, NOW(), NOW()),
(11, 'Welcome to LegalEase.', 'System', 0, NOW(), 0, NOW(), NOW()),
(12, 'Welcome to LegalEase.', 'System', 0, NOW(), 0, NOW(), NOW()),
(13, 'Welcome to LegalEase.', 'System', 0, NOW(), 0, NOW(), NOW());