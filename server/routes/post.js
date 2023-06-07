const express = require('express');
const router = express.Router();
const getRelationship = require('../tools/getRelationship')
const { Op } = require('sequelize')
const db = require("../../models")
const postResponse = require('../tools/postResponse')

const { Post, Profile, User, ImagePost, Like } = db

router.get('/all', async (req, res) =>{
    // const posts = await Post.findAll({include:["imagePost"]})

    // res.json(posts)
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

router.get('/', async (req, res) =>{
    const user = req.user
    const userProfile = req.user.dataValues.profile
    const { friends } = await getRelationship({ id:userProfile.id, type: "friend" })
    const friendsId = friends.map((item1) => item1.id)
    const postFriend = await Profile.findAll({ where: {id: {[Op.in]: friendsId}}, include: [
        {model: User, as:"user", include: [
            {model: Post, as: "post", attributes: ["id", "title", "userId", "createdAt"], include: [
                "imagePost", "userLike"
            ]}
        ]}
    ] })
    const posts = postResponse(postFriend, user)
    res.json(posts)
})

router.get('/:id', async (req, res) =>{
    const user = req.user
    const id = req.params.id
    const rawPosts = await Profile.findAll({ where: { userId: id }, include: [
        {model: User, as:"user", include: [
            {model: Post, as: "post", attributes: ["id", "title", "userId", "createdAt"], include: [
                "imagePost", "userLike"
            ]}
        ]}
    ] })
    const posts = postResponse(rawPosts, user)
    res.json(posts)
})

router.post('/create', async (req, res) =>{
    const data = req.body
    const user = req.user
    let imagePost = { url: null }

    const post = await db.sequelize.transaction((t) =>{
        return Post.create({...data, userId: user.id, id: null}, {transaction: t})
    })
    if (data.imagePost !== "" && data.imagePost !== undefined){
        imagePost = await db.sequelize.transaction((t) =>{
            return ImagePost.create({ postId: post.id, url: data.imagePost }, {transaction: t})
        })
    }

    const newPost = await Post.findOne({ where: {id : post.id}, attributes: ["id", "title", "userId", "createdAt"],include:["imagePost"] })
    const responseObj = {
        ...newPost.dataValues,
        imagePost: imagePost.url,
        firstName: user.profile.dataValues.firstName,
        lastName: user.profile.dataValues.lastName,
        profileId: user.profile.dataValues.id,
        imageProfile: user.profile.dataValues.image,
        isLiked: false,
        likeCount: 0
    }

    res.json(responseObj)
})

router.delete('/delete', async (req, res) =>{
    const id = req.body.id
    const user = req.user

    const post = await Post.findOne({ where: {id: id, userId: user.id} })
    if (post !== null){
        await post.setUserLike([])
        await ImagePost.destroy({ where: {postId: id} })
        await Post.destroy({ where: {id:id, userId: user.id} })
    }

    res.json({ isSuccess: true })
})

router.put('/like', async (req, res) =>{
    const postId = req.body.postId
    const user = req.user
    const post = await Post.findOne({ where: {id : postId}, include: ["userLike"]})
    const userLike = post.dataValues.userLike.map((item1) =>item1.dataValues.id)
    const indexUserLike = userLike.findIndex(item1 => item1 === user.id)
    if (indexUserLike === -1){
        await post.setUserLike([...userLike, user.id])
        res.json({ status: "liked" })
    }
    else{
        const removeUserLike = [...userLike.slice(0, indexUserLike), ...userLike.slice(indexUserLike+1)]
        await post.setUserLike(removeUserLike)
        res.json({ status: "unliked" })
    }

    res.json(post)
})

router.put('/update', async (req, res) =>{
    const data = req.body

    const result = await db.sequelize.transaction((t) =>{
        return Post.update(data, { where: { id: data.id } }, {transaction: t})
    })

    res.json(result)
})

module.exports = router;