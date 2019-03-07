import React from "react";
import { MidiNumbers } from 'react-piano';
import Dimensions from 'react-dimensions';
import _ from "lodash"
import SoundfontProvider from "../providers/SoundFontProvider";
import { CircularProgress } from "@material-ui/core";
import { element } from "prop-types";
class NotesGrid extends React.Component {
    render() {
        const notes = []
        for (let i = this.props.noteRange.first; i <= this.props.noteRange.last; i++)
            notes.push(MidiNumbers.getAttributes(i))
        notes.reverse()
        const canvasContainer = this.refs.canvasContainer
        return (
            <div ref="canvasContainer" className="gridContainer" style={{
                height: window.innerHeight / 2 - 30, bottom: window.innerHeight / 4
            }}>
                < SoundfontProvider
                    instrumentName={this.props.instrumentName || "acoustic_grand_piano"}
                    render={({ isLoading, playNote, stopNote }) => (
                        <Canvas
                            midiOffset={this.props.noteRange.first}
                            recording={this.props.recording}
                            notes={notes}
                            playNote={playNote}
                            stopNote={stopNote}
                            loading={isLoading}
                            canvasContainer={canvasContainer}
                            setRecording={this.props.setRecording}
                        >
                        </Canvas>)}></SoundfontProvider>
            </div>
        )
    }
}

export default Dimensions()(NotesGrid)
const canvasStyle = {
    background: "rgba(4,32,55,0.7)"
}
let RECT_HEIGHT = 15
const RECT_WIDTH = 30
const RECT_SPACE = 0.5
const RECT_COLOR = "rgba(4,32,55,1)"
const FIRST_RECT_COLOR = "rgb(255,255,255)"
const NOTE_COLOR = "#61dafb"
const START_TIME = window.innerWidth / (RECT_WIDTH + RECT_SPACE)
const RECT_TIME = 5
class Canvas extends React.Component {
    coordsMap = []
    eventsRect = []
    canvasWidth = null
    lastEvent = {}
    fontSize = null
    offsetFirst = null

    drawInitial = (canvas) => {
        let xLength = (this.props.recording.currentTime * RECT_TIME) + 5 < window.innerWidth / (RECT_WIDTH + RECT_SPACE) ? window.innerWidth / (RECT_WIDTH + RECT_SPACE) : this.props.recording.currentTime * RECT_TIME + 5
        let c = canvas.getContext("2d")
        canvas.width = (xLength * (RECT_WIDTH + RECT_SPACE))
        this.canvasWidth = canvas.width
        canvas.height = this.props.canvasContainer.getBoundingClientRect().height - 16
        RECT_HEIGHT = (canvas.height - RECT_SPACE * this.props.notes.length) / this.props.notes.length
        this.fontSize = RECT_HEIGHT * 0.8
        this.offsetFirst = this.fontSize
        this.coordsMap = []
        this.props.notes.forEach((n, i) => {
            for (let j = 0; j < xLength; j++) {
                if (j === 0) {
                    c.fillStyle = "white"
                    c.font = `${this.fontSize}12px Arial`
                    c.fillText(n.note, 3, (RECT_HEIGHT / this.fontSize / 2 + this.fontSize) + i * (RECT_HEIGHT + RECT_HEIGHT / (this.fontSize * 2.6)))
                }
                else {
                    let x = j * RECT_WIDTH + this.offsetFirst + RECT_SPACE * j
                    let y = i * RECT_HEIGHT + RECT_SPACE * i
                    c.fillStyle = RECT_COLOR
                    c.fillRect(x, y, RECT_WIDTH, RECT_HEIGHT);
                    this.coordsMap.push({ midiNumber: n.midiNumber, x, y })
                }
            }
        });
        if (this.props.recording.events.length > 0) {
            this.props.recording.events.forEach((n, i) => {
                const x = RECT_WIDTH + Math.floor(n.time * RECT_WIDTH * RECT_TIME) + this.offsetFirst
                const y = Math.floor(canvas.height - ((n.midiNumber - this.props.midiOffset) * RECT_HEIGHT + RECT_SPACE * (n.midiNumber - this.props.midiOffset))) - (RECT_HEIGHT + RECT_SPACE)
                const width = Math.floor(n.duration * RECT_WIDTH * RECT_TIME)
                c.fillStyle = NOTE_COLOR
                c.clearRect(x, y, width, RECT_HEIGHT);
                c.fillRect(x, y, width, RECT_HEIGHT);
                if (x >= this.props.canvasContainer.getBoundingClientRect().width - 200) {
                    this.props.canvasContainer.scroll(x, y)
                }

            });
        }
        if (this.eventsRect.length === 0) {
            return
        }
        this.eventsRect.forEach(eventRect => {
            c.fillStyle = NOTE_COLOR
            c.clearRect(eventRect.x, eventRect.y, RECT_WIDTH, RECT_HEIGHT);
            c.fillRect(eventRect.x, eventRect.y, RECT_WIDTH, RECT_HEIGHT);
        })
    }

    showCoords = (event) => {
        var x = event.clientX + this.props.canvasContainer.scrollLeft
        var y = event.clientY - 240;
        const rect = this.coordsMap.find(i =>
            (x >= i.x && x <= (i.x + RECT_WIDTH)) && (y >= i.y && y <= (i.y + RECT_HEIGHT))
        )
        if (!rect || this.props.recording.mode !== "RECORDING")
            return
        if (rect.x >= this.props.canvasContainer.getBoundingClientRect().width - 200) {
            this.props.canvasContainer.scroll(rect.x, rect.y)
        }
        const lastEvent = {
            midiNumber: rect.midiNumber,
            time: (rect.x - (RECT_WIDTH) - this.offsetFirst) / RECT_WIDTH / RECT_TIME,
            duration: 1 / RECT_TIME
        }
        this.playNote(lastEvent)
        this.props.setRecording({
            events: this.props.recording.events.concat(lastEvent),
            currentTime: (lastEvent.time + lastEvent.duration) > this.props.recording.currentTime ?
                lastEvent.time + lastEvent.duration : this.props.recording.currentTime
        })
        const canvas = this.refs.canvas
        this.drawInitial(canvas)

    }

    playNote = (lastEvent) => {
        this.props.playNote(lastEvent.midiNumber)
        window.setTimeout(() => this.props.stopNote(lastEvent.midiNumber), lastEvent.duration * 1000)
    }
    componentWillReceiveProps(newProps) {
        const canvas = this.refs.canvas
        if (newProps.recording.events.length !== this.props.recording.events.length) {
            this.drawInitial(canvas)
        }
    }
    componentDidUpdate() {
        const canvas = this.refs.canvas
        if (canvas)
            this.drawInitial(canvas)
    }
    render() {
        return (
            <div>
                {this.props.loading ? <CircularProgress></CircularProgress> :
                    <canvas id="canvas" ref="canvas" style={canvasStyle} onClick={this.showCoords} />}
            </div>
        )
    }
}
