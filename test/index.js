var Promise       = require( '../promise' ),
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

        it( 'Promise.resolve', done => {
            Promise.resolve().then( done )
        } )

        it( 'Promise.reject', done => {
            Promise.reject().then( () => {
            }, done )
        } )

        it( 'catch error', done => {
            new Promise( () => {
                fakeAsyncOperation( () => {
                    throw Error( 'error' )
                } )
            } ).catch( done )
        } )

        it( 'state cannot be changed once it was settled', done => {
            var promise = new Promise( ( resolve, reject ) => {
                fakeAsyncOperation( () => {
                    resolve( Math.PI )
                    reject( 0 )
                    resolve( Math.sqrt( -1 ) )
                } )
            } )
            promise.then( pi => {
                if ( pi === Math.PI ) {
                    done()
                }
            } )
        } )
    } )
} )
