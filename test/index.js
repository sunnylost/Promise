var Promise = require( '../promise' ),
    maxTimeLength = 1000

function fakeAsyncOperation( fn ) {
    setTimeout( () => {
        fn()
    }, maxTimeLength * Math.random() )
}

describe( 'Promise', () => {
    describe( 'basic', () => {
        it( 'resolve', done => {
            new Promise( resolve => {
                fakeAsyncOperation( resolve )
            } ).then( done )
        } )

        it( 'reject', done => {
            new Promise( ( resolve, reject ) => {
                fakeAsyncOperation( reject )
            } ).then( () => {
            }, done )
        } )

        it( 'catch error', done => {
            new Promise( () => {
                fakeAsyncOperation( () => {
                    throw Error( 'error' )
                } )
            } ).catch( done )
        } )
    } )
} )
