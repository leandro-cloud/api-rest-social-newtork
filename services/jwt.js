// Importar dependencias
import jwt from 'jwt-simple'
import moment from 'moment' // Ayuda con la gestion de fechas y cuantos segundos han transcurrido

// Clave secreta
const secret = 'SECRET'

// Metodo para generar tokens
const createToken = (user) => {
  const payload = {
    userId: user._id,
    role: user.role,
    name: user.name,
    iat: moment().unix(),
    exp: moment().add(30, 'days').unix()
  }
  // Devolver el token creado
  return jwt.encode(payload, secret)
}

export {
  secret,
  createToken
}
