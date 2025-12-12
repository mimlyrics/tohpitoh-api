const { models } = require('../models');
const bcrypt = require('bcrypt');
const { generateAccessToken, generateToken } = require('../utils/generate-token');

async function seedDatabase() {
    const count = await models.User.count();
    if (count > 0) {
        console.log("Skipping seeding — users already exist.");
        return;
    }

    // =====================================================
    // 1. CREATE USERS
    // =====================================================
    const usersData = [];

    // 15 Patients (role: user)
    for (let i = 1; i <= 15; i++) {
        usersData.push({
            first_name: `UserFirst${i}`,
            last_name: `UserLast${i}`,
            email: `user${i}@example.com`,
            password: `password${i}`,
            phone: `9000000${i.toString().padStart(2, '0')}`,
            country: `Country${i}`,
            role: 'user',
        });
    }

    // 5 Doctors
    for (let i = 16; i <= 20; i++) {
        usersData.push({
            first_name: `DoctorFirst${i}`,
            last_name: `DoctorLast${i}`,
            email: `doctor${i}@example.com`,
            password: `doctorpass${i}`,
            phone: `9200000${i.toString().padStart(2, '0')}`,
            country: `DoctorCountry${i}`,
            role: 'doctor',
        });
    }

    // 3 Laboratories
    for (let i = 21; i <= 23; i++) {
        usersData.push({
            first_name: `LabFirst${i}`,
            last_name: `LabLast${i}`,
            email: `lab${i}@example.com`,
            password: `labpass${i}`,
            phone: `9300000${i.toString().padStart(2, '0')}`,
            country: `LabCountry${i}`,
            role: 'laboratory',
        });
    }

    // 3 Admins
    for (let i = 1; i <= 3; i++) {
        usersData.push({
            first_name: `AdminFirst${i}`,
            last_name: `AdminLast${i}`,
            email: `admin${i}@gmail.com`,
            password: `adminpass${i}`,
            phone: `9100000${i.toString().padStart(2, '0')}`,
            country: `AdminCountry${i}`,
            role: 'admin',
        });
    }

    // Insert Users
    const createdUsers = [];
    for (const u of usersData) {
        const user = await models.User.create(u);

        const refreshToken = generateToken(null, user.id, user.role);
        const accessToken = generateAccessToken(null, user.id, user.role);

        await user.update({ refreshToken: [...user.refreshToken, refreshToken] });

        createdUsers.push(user);
    }

    console.log("Users created:", createdUsers.length);

    // =====================================================
    // 2. CREATE PATIENTS
    // =====================================================
    const createdPatients = [];

    const genders = ["male", "female"];
    const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const genotypes = ["AA", "AS", "SS", "AC"];
    const allergies = ["none", "dust", "pollen", "milk", "peanuts", "seafood"];
    const diseases = ["none", "diabetes", "hypertension", "asthma", "ulcer"];

    function randomFrom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    for (let i = 1; i <= 15; i++) {
        const patient = await models.Patient.create({
            user_id: i,
            gender: randomFrom(genders),
            date_of_birth: new Date(
                1980 + Math.floor(Math.random() * 20),   // year 1980–1999
                Math.floor(Math.random() * 12),          // month 0–11
                Math.floor(Math.random() * 28) + 1       // day 1–28
            ),
            blood_type: randomFrom(bloodTypes),
            genotype: randomFrom(genotypes),
            known_allergies: randomFrom(allergies),
            known_diseases: randomFrom(diseases),
            emergency_access_enabled: Math.random() < 0.3, // 30% chance true
            emergency_access_code: Math.floor(100000 + Math.random() * 900000) // 6-digit code
        });

        createdPatients.push(patient);
    }


    console.log("Patients created:", createdPatients.length);

    // =====================================================
    // 3. CREATE DOCTORS
    // =====================================================
    const createdDoctors = [];
    let docIndex = 1;
    for (let i = 16; i <= 20; i++) {
        const doctor = await models.Doctor.create({
            user_id: i,
            specialization: `Specialization ${docIndex}`,
            license_number: `DOC-LIC-${1000 + docIndex}`,
            hospital_affiliation: `Hospital ${docIndex}`,
            is_approved: true,
            approved_by_admin_id: 16, 
            approved_at: new Date()
        });
        createdDoctors.push(doctor);
        docIndex++;
    }

    console.log("Doctors created:", createdDoctors.length);

    // =====================================================
    // 4. CREATE LABORATORIES
    // =====================================================
    const createdLabs = [];
    let labIndex = 1;
    for (let i = 21; i <= 23; i++) {
        const lab = await models.Laboratory.create({
            user_id: i,
            lab_name: `Laboratory ${labIndex}`,
            license_number: `LAB-LIC-${2000 + labIndex}`,
            address: `Address ${labIndex}`,
            is_approved: true,
            approved_by_admin_id: 16,
            approved_at: new Date()
        });
        createdLabs.push(lab);
        labIndex++;
    }

    console.log("Laboratories created:", createdLabs.length);

    // =====================================================
    // 5. PRESCRIPTIONS
    // =====================================================
    for (let i = 1; i <= 10; i++) {
        await models.Prescription.create({
            patient_id: i,
            doctor_id: createdDoctors[0].id,
            medication_name: `Medication ${i}`,
            dosage: "2 tablets",
            frequency: "twice daily",
            duration: "7 days",
            instructions: "Take after meals"
        });
    }

    console.log("Prescriptions created: 10");

    // =====================================================
    // 6. MEDICAL RECORDS
    // =====================================================
    for (let i = 1; i <= 10; i++) {
        await models.MedicalRecord.create({
            patient_id: i,
            record_type: 'consultation',
            title: `Consultation Record ${i}`,
            description: `General consultation record ${i}`,
            doctor_id: createdDoctors[0].id,
            laboratory_id: createdLabs[0].id,
            is_shared: false
        });
    }

    console.log("Medical Records created: 10");

    // =====================================================
    // 7. LAB TESTS
    // =====================================================
    for (let i = 1; i <= 10; i++) {
        await models.LabTest.create({
            patient_id: i,
            doctor_id: createdDoctors[0].id,
            laboratory_id: createdLabs[0].id,
            test_name: `Blood Test ${i}`,
            status: "completed",
            results: "Normal",
            ordered_date: new Date(),
            completed_date: new Date()
        });
    }

    console.log("Lab Tests created: 10");

    // =====================================================
    // 8. ACCESS PERMISSIONS
    // =====================================================
    for (let i = 1; i <= 5; i++) {
        await models.AccessPermission.create({
            patient_id: i,
            granted_to_id: createdDoctors[0].user_id,
            granted_by_id: createdPatients[i - 1].user_id,
            access_type: "view",
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            purpose: "Doctor consultation"
        });
    }

    console.log("Access Permissions created: 5");

    console.log("🌱 DATABASE SEEDED SUCCESSFULLY!");


}

module.exports = { seedDatabase };
