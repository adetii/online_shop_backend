import bcrypt from 'bcryptjs';

const users = [
  {
    name: 'Admin User',
    email: 'kwadjofrancis004@gmail.com',
    password: bcrypt.hashSync('123456789', 10),
    role: 'admin',
    isEmailVerified: true
  },
  {
    name: 'John Doe',
    email: 'ducheskenzie@gmail.com',
    password: bcrypt.hashSync('123456789', 10),
    isEmailVerified: true
  },
  {
    name: 'Jane Doe',
    email: 'adetielorm91@gmail.com',
    password: bcrypt.hashSync('123456789', 10),
    isEmailVerified: true
  }
];

export default users;