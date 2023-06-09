const express = require('express');
const router = express.Router();
const db = require('../../models')
const getProfile = require('../tools/getProfile')
const { Op } = require('sequelize')

const { Profile, Relationship, Tag, Category, FavTag, User } = db

router.get('/my-profile', async (req, res) =>{
    const profile = await getProfile({profileQuery: {userId: req.user.id}, otherQuery: {user: req.user}})
    res.json(...profile)
})

router.get('/my-account', async (req, res) =>{
    const account = await User.findOne({ where:{id: req.user.id}, attributes: {exclude: ['password', 'updatedAt', 'createdAt', 'id']}, include:[
        {model: Profile, as:"profile"}        
    ]})
    const result = {...account.dataValues, ...account.dataValues.profile.dataValues}
    delete result['profile']
    res.json(result)
})

router.get('/profile/:id', async (req, res) =>{
    const id = req.params.id
    const profile = await getProfile({profileQuery: { id }, otherQuery: {user: req.user}})
    res.json(...profile)
})

router.put('/update', async (req, res) =>{
    const data = req.body
    console.log(req.user.id)

    const profile = await db.sequelize.transaction((t) =>{
        User.update({ email: data?.email }, { where: { id: req.user.id } }, {transaction: t})
        return Profile.update(data, { where: { userId: req.user.id } }, {transaction: t})
    })

    res.json(profile)
})

router.put('/add-tag', async (req, res) =>{
    const data = req.body
    const newTags = data.tag

    const profile = await Profile.findOne({where:{userId: req.user.id}, include:[
        {model: Tag, as: "tag", attributes: ["id"], through: { attributes: [] }}
    ]})
    const tags = profile.dataValues.tag.map(item1 => item1.id)

    try{
        profile.setTag([...tags, ...newTags])
        res.redirect('/account/my-profile')
    }
    catch(e){
        res.json([...tags, ...newTags])
    }
})

router.put('/remove-tag', async (req, res) =>{
    const removetag = req.body.tag

    const profile = await Profile.findOne({where:{userId: req.user.id}, include:[
        {model: Tag, as: "tag", attributes: ["id"], through: { attributes: [] }}
    ]})
    const setTags = profile.dataValues.tag.map(item1 => item1.id).filter((item1) =>{
        const index = removetag.findIndex(item2 => item1 === item2)
        console.log(index, item1)
        if (index === -1)
            return true
        return false
    })

    try{
        profile.setTag(setTags)
        res.redirect('/account/my-profile')
    }
    catch(e){
        res.json(setTags)
    }

    //res.json(setTags)
})

router.post('/create-tag', async (req, res) =>{
    const data = req.body
    let tag = await Tag.findOne({where: {name: data.name}})
    if (!tag){
      tag = await db.sequelize.transaction((t) =>{
          return Tag.create(data, {transaction: t})
        })
    }
    if (data.category && data.type === 'favorites'){
  
      let category = await Category.findOne({where: { name: data.category }})
      if (!category){
        category = await db.sequelize.transaction((t) =>{
          return Category.create({ name: data.category }, {transaction: t})
        })
      }
      const favTag = await db.sequelize.transaction((t) =>{
        return FavTag.create({ tagId: tag.dataValues.id, categoryId: category.dataValues.id }, {transaction: t})
      })
      res.json(favTag)
    }
    res.json(tag)
})

router.get('/category', async (req, res) =>{
    const categories = await Category.findAll({ attributes: ["id", "name"] })

    res.json(categories)
})

module.exports = router