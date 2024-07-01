import bcrypt from 'bcrypt'
import { User } from '../models/user.js'
import { createToken } from '../services/jwt.js'
import fs from 'fs'
import path from 'path'
import { followThisUser, followUserIds } from '../services/followServices.js'
import { Follow } from '../models/follows.js'
import { Publication } from '../models/publication.js'

export const testUser = (req, res) => {
  return res.status(200).send({
    message: 'Mensaje enviado desde el controlador: user.js'
  })
}

export const register = async (req, res) => {
  try {
    const params = req.body

    // Validaciones: verificamos que los datos obligatorios estén presentes
    if (!params.name || !params.last_name || !params.email || !params.password || !params.nick) {
      return res.status(400).json({
        status: 'error',
        message: 'Faltan datos por enviar'
      })
    }

    // Crear una instancia del modelo User con los datos validados
    const userToSave = new User(params)

    // Buscar si ya existe un usuario con el mismo email o nick
    const existingUser = await User.findOne({
      $or: [
        { email: userToSave.email.toLowerCase() },
        { nick: userToSave.nick.toLowerCase() }
      ]
    })

    // Si encuentra un usuario, devuelve un mensaje indicando que ya existe
    if (existingUser) {
      return res.status(409).json({
        status: 'success',
        message: 'El usuario ya existe'
      })
    }

    // Cifrar contraseña
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(userToSave.password, salt)
    userToSave.password = hashedPassword

    // Guardar el usuario en la base de datos
    await userToSave.save()

    // Devolver respuesta exitosa y el usuario registrado
    return res.status(201).json({
      status: 'created',
      message: 'Usuario registrado con éxito',
      user: {
        id: userToSave._id,
        name: userToSave.name,
        last_name: userToSave.last_name,
        nick: userToSave.nick
      }
    })
  } catch (error) {
    console.log('Error en registro de usuario', error)
    return res.status(500).json({
      status: 'error',
      message: 'Error en registro de usuarios'
    })
  }
}

export const login = async (req, res) => {
  try {
    const params = req.body

    if (!params.email || !params.password) {
      return res.status(400).send({
        status: 'error',
        message: 'Faltan datos por enviar'
      })
    }

    const user = await User.findOne({ email: params.email.toLowerCase() })

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado'
      })
    }

    const validPassword = await bcrypt.compare(params.password, user.password)

    if (!validPassword) {
      return res.status(401).json({
        status: 'error',
        message: 'Contraseña incorrecta' // arreglar esto
      })
    }

    // Gernerar token de autenticacion
    const token = createToken(user)

    // Devolver Token generado y los datos del usuario
    return res.status(200).json({
      status: 'success',
      message: 'Login exitoso',
      token,
      user: {
        id: user._id,
        name: user.name,
        last_name: user.last_name,
        bio: user.bio,
        email: user.email,
        nick: user.nick,
        role: user.role,
        image: user.image,
        created_at: user.created_at
      }
    })
  } catch (error) {
    console.log('Error en el login del usuario: ', error)
    return res.status(500).json({
      status: 'error',
      message: 'Error en el login del usuario'
    })
  }
}

// Metodo para mostrar el perfil del usuario
export const profile = async (req, res) => {
  try {
    // Obtener el ID del usuario desde los parámetros de la URL
    const userId = req.params.id

    // Verificar si el ID recibido del usuario autenticado existe
    if (!req.user || !req.user.userId) {
      return res.status(404).send({
        status: 'error',
        message: 'Usuario no autenticadp'
      })
    }

    // Buscar al usuario en la BD, excluimos la contraseña, rol, versión.
    const userProfile = await User.findById(userId).select('-password -role -__v')

    // Verificar si el usuario existe
    if (!userProfile) {
      return res.status(404).send({
        status: 'error',
        message: 'Usuario no encontrado'
      })
    }

    // Información de seguimiento - (req.user.userId = Id del usuario autenticado)
    const followInfo = await followThisUser(req.user.userId, userId)

    // Devolver la información del perfil del usuario
    return res.status(200).json({
      status: 'success',
      user: userProfile,
      followInfo
    })
  } catch (error) {
    console.log('Error al botener el perfil del usuario:', error)
    return res.status(500).send({
      status: 'error',
      message: 'Error al obtener el perfil del usuario'
    })
  }
}

// Metodo para listar usuarios con paginacion
export const listUsers = async (req, res) => {
  try {
    const page = req.params.page ? parseInt(req.params.page, 10) : 1
    const itemsPerPage = req.query.limit ? parseInt(req.query.limit, 10) : 5

    // Realizar la consulta paginada
    const options = {
      page,
      limit: itemsPerPage,
      select: '-password -role -__v -email'
    }

    const users = await User.paginate({}, options)

    if (!users || users.docs.length === 0) {
      return res.status(404).send({
        status: 'error',
        messae: 'No hay usuarios disponibles'
      })
    }

    // Listar los seguidores de un usuario, obtener el array de IDs de los usuarios que sigo
    const followUsers = await followUserIds(req)

    // Devolver los usuarios paginados
    return res.status(200).send({
      status: 'success',
      users: users.docs,
      totalDocs: users.totalDocs,
      totalPages: users.totalPages,
      page: users.page,
      pagingCounter: users.pagingCounter,
      hasPrevPage: users.hasPrevPage,
      hasNextPage: users.hasNextPage,
      prevPage: users.prevPage,
      nextPage: users.nextPage,
      users_following: followUsers.following,
      users_follow_me: followUsers.followers
    })
  } catch (error) {
    console.log('Error al listar los usuarios', error)
    return res.status(500).send({
      status: 'error',
      message: 'Error al listar los usuarios'
    })
  }
}

// Metodo para actualizar los datos del usuario
export const updateUser = async (req, res) => {
  try {
    // Recoger la informacion del usuario a actualizar
    const userIdentity = req.user
    const userToUpdate = req.body
    console.log(userIdentity)

    // Validar que los campos necesarios esten presentes.
    if (!userToUpdate.email || !userToUpdate.nick) {
      return res.status(400).send({
        status: 'Error',
        message: 'Los campos de email y usuario son requeridos'
      })
    }

    // Eliminar campos sobrantes
    delete userToUpdate.iat
    delete userToUpdate.ext
    delete userToUpdate.role
    delete userToUpdate.image

    // Comprobar si el usuario ya existe
    const users = await User.find({
      $or: [
        { email: userToUpdate.email.toLowerCase() },
        { nick: userToUpdate.nick.toLowerCase() }
      ]
    }).exec()

    // Verificar si el usuario esta duplicado y evitar conflictos
    const isDuplicateUser = users.some(user => {
      return user && user._id.toString() !== userIdentity.userId
    })

    if (isDuplicateUser) {
      return res.status(400).send({
        status: 'error',
        message: 'Solo se puede modificar los datos del usuario logueado'
      })
    }

    // Cifrar la contraseña si se proporciona
    if (userToUpdate.password) {
      try {
        const pwd = await bcrypt.hash(userToUpdate.password, 10)
        userToUpdate.password = pwd
      } catch (hashError) {
        return res.status(500).send({
          status: 'error',
          message: 'Error al cifrar la contraseña'
        })
      }
    } else {
      delete userToUpdate.password
    }

    // Buscar y Actualizar el usuario a modificar en la base de datos
    const userUpdated = await User.findByIdAndUpdate(userIdentity.userId, userToUpdate, { new: true })

    if (!userUpdated) {
      return res.status(400).send({
        status: 'error',
        message: 'Error al actualizar el usuario'
      })
    }

    // Devolver respuesta exitosa con el usuario actualizado
    return res.status(200).json({
      status: 'success',
      message: 'Usuario actualizado correctamente',
      user: userUpdated
    })
  } catch (error) {
    console.log('Error al actualizar los datos del usuario', error)
    return res.status(500).send({
      status: 'error',
      message: 'Error al actualizar los datos del usuario'
    })
  }
}

// Metodo para subir imagenes (avatar)
export const uploadFiles = async (req, res) => {
  try {
    // Recoger el archivo de imagen y comprobamos que existe
    if (!req.file) {
      return res.status(404).send({
        status: 'error',
        message: 'La peticion no incluye la imagen'
      })
    }

    // Conseguir el nombre del archivo
    const image = req.file.originalname

    // Obtener la extension del archivo
    const imageSplit = image.split('.')
    const extension = imageSplit[imageSplit.length - 1]

    // Validar la extension
    if (!['png', 'jpg', 'jpeg', 'gif'].includes(extension.toLowerCase())) {
      // Borrar archivo subido
      const filePath = req.file.path
      fs.unlinkSync(filePath)

      return res.status(400).send({
        status: 'error',
        message: 'Extension del archivo es invalido'
      })
    }

    // Comprobar tamaño del archivo
    const fileSize = req.file.size
    const maxFileSize = 2 * 1024 * 1024

    if (fileSize > maxFileSize) {
      const filePath = req.file.path
      fs.unlinkSync(filePath)
      return res.status(400).send({
        status: 'error',
        message: 'El tamaño del archivo excede el limite (max 2MB)'
      })
    }

    // Guardar la imagen en la BD
    const userUpdated = await User.findByIdAndUpdate(
      { _id: req.user.userId },
      { image: req.file.filename },
      { new: true }
    )

    // Verificar si la actualizacion fue exitosa
    if (!userUpdated) {
      return res.status(500).send({
        status: 'error',
        message: 'Error en la subida de la imagen'
      })
    }

    // Devolver respuesta exitosa
    return res.status(200).json({
      status: 'success',
      user: userUpdated,
      file: req.file
    })
  } catch (error) {
    console.log('Error al subir archivos', error)
    return res.status(500).send({
      status: 'error',
      message: 'Error al subir archivos'
    })
  }
}

// Metodo para mostrar la imagen del perfil
export const avatar = async (req, res) => {
  try {
    // Obtener el parámetro de la url
    const file = req.params.file

    // Obtener el path real de la imagen
    const filePath = './uploads/avatar/' + file

    // Comprobamos si existe
    fs.stat(filePath, (_, exists) => {
      if (!exists) {
        return res.status(404).send({
          status: 'error',
          message: 'No existe la imagen'
        })
      }
      // Devolver el archivo
      return res.sendFile(path.resolve(filePath))
    })
  } catch (error) {
    console.log('Error al mostrar la imagen', error)
    return res.status(500).send({
      status: 'error',
      message: 'Error al mostrar la imagen'
    })
  }
}

// Metodo para mostrar el contador de seguidores
export const counters = async (req, res) => {
  try {
    // Obtener el id del usuario autenticado desde el token
    let userId = req.user.userId

    // En caso de llegar el id del usuario en los parametros (por la url) se toma como prooridad
    if (req.params.id) {
      userId = req.params.id
    }

    // Buscar el usuario por su userId para obtener nombre y apellido
    const user = await User.findById(userId, { name: 1, last_name: 1 })

    // Si no encuentra al usuario
    if (!user) {
      return res.status(404).send({
        status: 'error',
        message: 'Usuario no encontrado'
      })
    }

    // Contar el numero de usuarios que yo sigo (el usuario autenticado)
    const followingCount = await Follow.countDocuments({ following_user: userId })

    // Contar el numero de usuarios que me siguen (al usuario autenticado)
    const followedCount = await Follow.countDocuments({ followed_user: userId })

    // Contar el numero de publicaciones que ha realizado el usuario
    const publicationsCount = await Publication.countDocuments({ user_id: userId })

    return res.status(200).json({
      status: 'success',
      userId,
      name: user.name,
      last_name: user.last_name,
      following: followingCount,
      followers: followedCount,
      publicatios: publicationsCount
    })
  } catch (error) {
    console.log('Error al mostrar la imagen', error)
    return res.status(500).send({
      status: 'error',
      message: 'Error en los contadores'
    })
  }
}
