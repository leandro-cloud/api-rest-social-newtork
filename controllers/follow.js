import { Follow } from '../models/follows.js'
import { User } from '../models/user.js'
import { followUserIds } from '../services/followServices.js'

export const testFollow = (req, res) => {
  return res.status(200).send({
    message: 'Mensaje enviado desde el controlador: follow.js'
  })
}

// Metodo para guardar un follow (seguir a otro usuario)
export const saveFollow = async (req, res) => {
  try {
    // Obtener datos del body
    const { followed_user } = req.body

    // Obtener el id del usuario autenticado desde el token
    const identity = req.user

    // Verificar si identity contiene la informacion del usuario autenticado
    if (!identity || !identity.userId) {
      return res.status(400).send({
        status: 'error',
        message: 'No se ha proporcionado el usuario para realizar el following'
      })
    }

    // Verificar si el usuario esta intentando seguirse a si mismo
    if (identity.userId === followed_user) {
      return res.status(400).send({
        status: 'error',
        message: 'No te puedes seguir a ti  mismo'
      })
    }

    // Verificar si el usuario a seguir existe
    const followedUser = await User.findById(followed_user)
    if (!followedUser) {
      return res.status(400).send({
        status: 'error',
        message: 'El usuario que intentas seguir no existe'
      })
    }

    // Verificar si ya existe un seguimiento con los mismos usuarios
    const existingFollow = await Follow.findOne({
      following_user: identity.userId,
      followed_user
    })

    if (existingFollow) {
      return res.status(400).send({
        status: 'error',
        message: 'Ya estas siguiendo a este usuario'
      })
    }

    // Crear el objeto con modelo follow
    const newFollow = new Follow({
      following_user: identity.userId,
      followed_user
    })

    // Guardar en la DB
    const followStored = await newFollow.save()

    // Verificar si se guardo correctamente en la DB
    if (!followStored) {
      return res.status(500).send({
        status: 'error',
        message: 'No se ha podido seguir al usuario'
      })
    }

    // Obtener el nombre y apellido del usuario seguido
    const followedUserDetails = await User.findById(followed_user).select('name last_name')

    if (!followedUserDetails) {
      return res.status(404).send({
        status: 'error',
        message: 'Usuario seguido no encontrado'
      })
    }

    // combinar datos de follow y followedUser
    const combinedFollowData = {
      ...followStored.toObject(),
      followedUser: {
        name: followedUserDetails.name,
        last_name: followedUserDetails.last_name
      }
    }

    // Devolver la respuesta
    return res.status(200).send({
      status: 'success',
      identity: req.user,
      follow: combinedFollowData
    })
  } catch (error) {
    console.log('Error al seguir al usuario', error)
    return res.status(500).send({
      status: 'error',
      message: 'Error al seguir al usuario'
    })
  }
}

// Metodo para eliminar un follow (dejar de seguir)

export const unfollow = async (req, res) => {
  try {
    // Obtener el Id del usuario identificado
    const userId = req.user.userId

    // Obtener el Id del usuario que sigo y quiero dejar de seguir
    const followedId = req.params.id

    // Busqueda de las coincidencias de ambos usuarios y eliminar
    const followDeleted = await Follow.findOneAndDelete({
      following_user: userId, // Quien realiza el seguimiento
      followed_user: followedId // A quien se quiere dejar de seguir
    })

    // Verificar si se encontro el documento y lo elimino
    if (!followDeleted) {
      return res.statur(404).send({
        status: 'error',
        message: 'No se encontro el seguimiento a eliminar'
      })
    }
    return res.status(200).send({
      status: 'success',
      message: 'Dejaste de seguir al usuario correctamente'
    })
  } catch (error) {
    return res.status(500).send({
      status: 'error',
      message: 'Error al dejar de seguir al usuario'
    })
  }
}

// Metodo listar usuarios que estoy siguiendo
export const following = async (req, res) => {
  try {
    // Obtener el ID del usuario identificado
    let userId = req.user && req.user.userId ? req.user.userId : undefined

    // comprobar si llega el ID por parametro en la url (este tiene prioridad)
    if (req.params.id) userId = req.params.id

    // Asignar el numero de pagina
    const page = req.params.page ? parseInt(req.params.page, 10) : 1

    // Numero de usuarios que queremos mostrar por pagina
    const itemsPerPage = req.query.limit ? parseInt(req.query.limit, 10) : 5

    // Configurar las opciones de la consulta
    const options = {
      page,
      limit: itemsPerPage,
      populate: {
        path: 'following_user followed_user',
        select: '-password -role -__v -email'
      },
      lean: true
    }

    // Buscar en la DB los seguidores y popular los datos de los usuarios
    const follows = await Follow.paginate({ following_user: userId }, options)

    // Listar los seguidores de un usuario, obtener el array de IDs de los usuarios que sigo
    const followUsers = await followUserIds(req)

    return res.status(200).send({
      status: 'success',
      message: 'Listado de usuarios que esto siguiendo',
      follows: follows.docs,
      total: follows.totalDocs,
      pages: follows.totalPages,
      page: follows.page,
      limit: follows.limit,
      users_following: followUsers.following,
      users_follow_me: followUsers.followers
    })
  } catch (error) {
    return res.status(500).send({
      status: 'error',
      message: 'Error al listar los usuarios que estas siguiendo'
    })
  }
}

// Metodo para listar los usuarios que me siguen
export const followers = async (req, res) => {
  try {
    // Obtener el ID del usuario identificado
    let userId = req.user && req.user.userId ? req.user.userId : undefined

    // comprobar si llega el ID por parametro en la url (este tiene prioridad)
    if (req.params.id) userId = req.params.id

    // Asignar el numero de pagina
    const page = req.params.page ? parseInt(req.params.page, 10) : 1

    // Numero de usuarios que queremos mostrar por pagina
    const itemsPerPage = req.query.limit ? parseInt(req.query.limit, 10) : 5

    // Configurar las opciones de la consulta
    const options = {
      page,
      limit: itemsPerPage,
      populate: {
        path: 'following_user',
        select: '-password -role -__v -email'
      },
      lean: true
    }

    // Buscar en la DB los seguidores y popular los datos de los usuarios
    const follows = await Follow.paginate({ follower_user: userId }, options)

    // Listar los seguidores de un usuario, obtener el array de IDs de los usuarios que sigo
    const followUsers = await followUserIds(req)

    return res.status(200).send({
      status: 'success',
      message: 'Listado de usuarios que esto siguiendo',
      follows: follows.docs,
      total: follows.totalDocs,
      pages: follows.totalPages,
      page: follows.page,
      limit: follows.limit,
      users_following: followUsers.following,
      users_follow_me: followUsers.followers
    })
  } catch (error) {
    return res.status(500).send({
      status: 'error',
      message: 'Error al listar los usuarios me siguen'
    })
  }
}
