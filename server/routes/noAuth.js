const express = require('express');
const router = express.Router();
const getRelationship = require('../tools/getRelationship')
const { Op } = require('sequelize')
const db = require("../../models")
const postResponse = require('../tools/postResponse')

const { Post, Profile, User, ImagePost, Like } = db

router.get('/post', async (req, res) =>{
    const postFriend = await Profile.findAll({ include: [
        {model: User, as:"user", attributes: {exclude: ['password', 'updatedAt', 'createdAt']}, include: [
            {model: Post, as: "post", attributes: ["id", "title", "userId", "content", "createdAt"], include: [
                "imagePost"
            ]}
        ]}
    ] })
    const mapping = (postFriend.map((item) => {
        const data = item.dataValues
        const post = data.user.dataValues.post
        let result = {...data, ...data.user.dataValues, post}
        delete result['user'];
        return result
    }))

    res.json(mapping)
})

router.put('/post/update', async (req, res) =>{
    const data = req.body

    const result = await db.sequelize.transaction((t) =>{
        return Post.update(data, { where: { id: data.id } }, {transaction: t})
    })

    res.json(result)
})

module.exports = router;