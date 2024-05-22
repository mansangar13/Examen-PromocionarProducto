import { Product, Order, Restaurant, RestaurantCategory, ProductCategory, sequelizeSession } from '../models/models.js'
import Sequelize from 'sequelize'

const indexRestaurant = async function (req, res) {
  try {
    const products = await Product.findAll({
      where: {
        restaurantId: req.params.restaurantId
      },
      include: [
        {
          model: ProductCategory,
          as: 'productCategory'
        }]
    })
    res.json(products)
  } catch (err) {
    res.status(500).send(err)
  }
}

const show = async function (req, res) {
  // Only returns PUBLIC information of products
  try {
    const product = await Product.findByPk(req.params.productId, {
      include: [
        {
          model: ProductCategory,
          as: 'productCategory'
        }]
    }
    )
    res.json(product)
  } catch (err) {
    res.status(500).send(err)
  }
}

const create = async function (req, res) {
  let newProduct = Product.build(req.body)
  try {
    newProduct = await newProduct.save()
    res.json(newProduct)
  } catch (err) {
    res.status(500).send(err)
  }
}

const update = async function (req, res) {
  try {
    await Product.update(req.body, { where: { id: req.params.productId } })
    const updatedProduct = await Product.findByPk(req.params.productId)
    res.json(updatedProduct)
  } catch (err) {
    res.status(500).send(err)
  }
}

const destroy = async function (req, res) {
  try {
    const result = await Product.destroy({ where: { id: req.params.productId } })
    let message = ''
    if (result === 1) {
      message = 'Sucessfuly deleted product id.' + req.params.productId
    } else {
      message = 'Could not delete product.'
    }
    res.json(message)
  } catch (err) {
    res.status(500).send(err)
  }
}

const popular = async function (req, res) {
  try {
    const topProducts = await Product.findAll(
      {
        include: [{
          model: Order,
          as: 'orders',
          attributes: []
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'description', 'address', 'postalCode', 'url', 'shippingCosts', 'averageServiceMinutes', 'email', 'phone', 'logo', 'heroImage', 'status', 'restaurantCategoryId'],
          include:
        {
          model: RestaurantCategory,
          as: 'restaurantCategory'
        }
        }
        ],
        attributes: {
          include: [
            [Sequelize.fn('SUM', Sequelize.col('orders.OrderProducts.quantity')), 'soldProductCount']
          ],
          separate: true
        },
        group: ['orders.OrderProducts.productId'],
        order: [[Sequelize.col('soldProductCount'), 'DESC']]
      // limit: 3 //this is not supported when M:N associations are involved
      })
    res.json(topProducts.slice(0, 3))
  } catch (err) {
    res.status(500).send(err)
  }
}

const promoteProduct = async function (req, res) {
  const t = await sequelizeSession.transaction()
  try {
    const product = await Product.findByPk(req.params.productId, { transaction: t })
    const restaurant = await Restaurant.findByPk(product.restaurantId, { transaction: t })
    if (product.promoted === false && restaurant.discount > 0) {
      const priceDiscount = product.price - (product.price * (restaurant.discount / 100))
      await Product.update(
        { promoted: true, priceWithDiscount: priceDiscount },
        { where: { id: product.id }, transaction: t }
      )
    } else if (product.promoted === true || restaurant.discount === 0) {
      await Product.update(
        { promoted: false },
        { where: { id: product.id }, transaction: t }
      )
    }
    await t.commit()
    const updatedProduct = await Restaurant.findByPk(req.params.productId)
    res.json(updatedProduct)
  } catch (error) {
    console.error(error)
    res.status(500).send(error)
  }
}

const ProductController = {
  indexRestaurant,
  show,
  create,
  update,
  destroy,
  popular,
  promoteProduct
}
export default ProductController
