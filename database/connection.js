import { connect } from 'mongoose'

export const connection = async () => {
  try {
    await connect('mongodb://localhost:27017/db_social_network')
    console.log('Conectado correctamente a la BD')
  } catch (error) {
    console.log(error)
    throw new Error('No se ha podido conectar a la base de datos')
  }
}
