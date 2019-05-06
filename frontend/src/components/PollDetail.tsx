import React, { SyntheticEvent } from 'react';
import { Modal, Button, Header, Image, Message, Icon, Form, Checkbox } from 'semantic-ui-react';
import { IPollDetailProps, IPollDetailStates, IPollDetail } from './types/PollDetail';
import { sendTransaction } from '../utils/web3';
import { StoreState } from '../store/types';
import { connect } from 'react-redux';
import { VOTING_ABI } from '../constants/contractABIs';
import { Pie, ChartData } from 'react-chartjs-2';
import style from './PollDetail.module.css';

class PollDetail extends React.Component<IPollDetailProps, IPollDetailStates> {
    private checkConfirmedInterval: any;
    private setTimeoutHolder: any;
    private contract: any;

    constructor(props: IPollDetailProps) {
        super(props);
        this.contract = new this.props.web3.eth.Contract(VOTING_ABI, this.props.address);
        this.checkConfirmedInterval = null;
        this.setTimeoutHolder = null;
        this.state = {
            waitingMessage: {
                show: false,
                message: null
            },
            errorMessage: {
                show: false,
                message: null
            },
            votingMessage: {
                selectedIndex: null,
                selectedOption: null
            },
            successfulMessage: {
                show: false
            },
            votedOption: null,
            chart: null,
            votesByIndex: null
        };
    }

    async componentDidMount() {
        const votesByIndex = await this.fetchVotesByIndex();
        this.setState({
            votesByIndex
        });

        const chartOptions = this.fetchChartOption();
        this.setState({
            chart: {
                option: chartOptions
            }
        })
    }

    async componentWillMount() {
        if (this.props.isVoted) {
            const selectedIndex = (await this.contract.methods.getMyOption(this.props.accountAddress).call()).toNumber();
            this.setState({
                votingMessage: {
                    selectedIndex,
                    selectedOption: this.props.options[selectedIndex]
                }
            })
        }
    }

    componentWillUnmount() {
        if (this.checkConfirmedInterval) {
            clearInterval(this.checkConfirmedInterval);
        }

        if (this.setTimeoutHolder) {
            clearTimeout(this.setTimeoutHolder);
        }
    }

    async componentDidUpdate(prevProps: IPollDetailProps) {
        const votesByIndex = await this.fetchVotesByIndex();
        this.setState({
            votesByIndex
        });
    }

    dynamicColors() {
        var r = Math.floor(Math.random() * 255);
        var g = Math.floor(Math.random() * 255);
        var b = Math.floor(Math.random() * 255);
        return "rgb(" + r + "," + g + "," + b + ")";
     };

    async vote(option: number) {
        this.setState({
            errorMessage: {
                show: false,
                message: null
            },
            waitingMessage: {
                show: true,
                message: 'Waiting for user prompt...'
            }
        })

        const web3 = this.props.web3;
        const from = this.props.accountAddress as string;
        const to = this.props.address;
        const data = this.props.contract.methods.vote(option).encodeABI();
        try {
            const txid = await sendTransaction(
                web3,
                from,
                to,
                data
            )
            this.setState({
                errorMessage: {
                    show: false,
                    message: null
                },
                waitingMessage: {
                    show: true,
                    message: 'Waiting for a few blocks being confirmed'
                }
            })
            this.checkConfirmedInterval = setInterval(async () => {
                try {
                    const receipt = await this.props.web3.eth.getTransactionReceipt(txid);
                    if (receipt) {
                        const chartOptions = await this.fetchChartOption();
                        this.setState({
                            waitingMessage: {
                                show: false,
                                message: null
                            },
                            successfulMessage: {
                                show: true
                            },
                            chart: {
                                option: chartOptions
                            }
                        });
                        clearInterval(this.checkConfirmedInterval);
                        this.setTimeoutHolder = setTimeout(() => {
                            this.setState({
                                successfulMessage: {
                                    show: false
                                }
                            })
                        }, 5000);
                    }
                } catch (error) {
                    // we skip any error
                    console.log('error occurred: ' + error);
                }
                
            }, 1000);
        } catch (error) {
            this.setState({
                waitingMessage: {
                    show: false,
                    message: null
                },
                errorMessage: {
                    show: true,
                    message: error.message
                }
            })

            this.setTimeoutHolder = setTimeout(() => {
                this.setState({
                    errorMessage: {
                        show: false,
                        message: null
                    }
                })
            }, 5000);
        }
    }

    handleOptionVoted(event: SyntheticEvent, object: any) {
        this.setState({
            votingMessage: {
                selectedIndex: object.value,
                selectedOption: object.name
            }
        })
    }

    async fetchVotesByIndex() {
        const votesByIndex: number[] = [];
        for (let i = 0; i < this.props.options.length; i++) {
            const votes = (await this.contract.methods.getVotesByIndex(i).call()).toNumber();
            votesByIndex.push(votes);
        }
        return votesByIndex;
    }

    fetchChartOption() {
        const titlesByIndex = [];
        const randomBackgroundsByIndex = [];
        const votesByIndex = this.state.votesByIndex || new Array(this.props.options.length).fill(0);
        for (let i = 0; i < this.props.options.length; i++) {
            const title = this.props.options[i];
            titlesByIndex.push(title);
            const color = this.dynamicColors();
            randomBackgroundsByIndex.push(color);
        }

        return {
            labels: titlesByIndex,
            datasets: [{
                data: votesByIndex,
                backgroundColor: randomBackgroundsByIndex,
                hoverBackgroundColor: randomBackgroundsByIndex
            }]
        }
    }

    render() {
        return (
            <div className={style['align-right']}>
                <Modal dimmer={true} trigger={
                <Button animated>
                    <Button.Content visible>Detail</Button.Content>
                    <Button.Content hidden>
                        <Icon name='arrow right' />
                    </Button.Content>
                </Button>}>
                    <Modal.Header>Poll detail</Modal.Header>
                    <Modal.Content image>
                        {/* <Image
                            wrapped
                            size="medium"
                            src="https://react.semantic-ui.com/images/avatar/large/rachel.png"
                        /> */}
                        <Modal.Description>
                            {
                                this.state.waitingMessage.show && (
                                    <Message icon>
                                        <Icon name='circle notched' loading />
                                        <Message.Content>
                                        <Message.Header>Just a few seconds</Message.Header>
                                        {this.state.waitingMessage.message}
                                        </Message.Content>
                                    </Message>
                                )
                            }
                            {
                                this.state.errorMessage.show && (
                                    <Message
                                        error
                                        header='There was some errors with your submission'
                                        list={[
                                            this.state.errorMessage.message,
                                        ]}
                                    />
                                )
                            }
                            {
                                this.state.successfulMessage.show && (
                                    <Message positive>
                                        <Message.Header>You vote successfully!</Message.Header>
                                        <p>Your transaction has been confirmed.</p>
                                    </Message>
                                )
                            }
                            <Header>{this.props.title}</Header>
                            <div>
                                <div className={style['inline-left']}>
                                    <div>
                                        Expiry Block Height: {this.props.expiryBlockHeight}
                                    </div>
                                    <Form>
                                        {
                                            this.props.options.map((option, index) => {
                                                return (
                                                    <Form.Field>
                                                        <Checkbox
                                                            radio
                                                            label={
                                                                (this.state.votesByIndex && this.props.votesAmount > 0) ? (
                                                                    option + ' (' + Math.floor((this.state.votesByIndex[index] / this.props.votesAmount) * 100) + '%)'
                                                                ) : option
                                                            }
                                                            name={option}
                                                            value={index}
                                                            checked={this.state.votingMessage.selectedIndex === index}
                                                            onChange={this.handleOptionVoted.bind(this)}
                                                            disabled={this.props.isVoted}
                                                        />
                                                    </Form.Field>
                                                )
                                            })
                                        }
                                        {
                                            this.state.votingMessage.selectedOption && (
                                                <Form.Field>
                                                    { this.props.isVoted ? ('You haved voted for') : ('You are voting for')} <b>{ this.state.votingMessage.selectedOption }</b>
                                                </Form.Field>
                                            )
                                        }
                                    </Form>
                                    {
                                        (this.state.votingMessage.selectedIndex !== null && !this.props.isVoted) && (
                                            <Button content='Vote!' onClick={() => this.vote(this.state.votingMessage.selectedIndex as number)}/>
                                        )
                                    }
                                </div>
                                <div className={style['inline-right']}>
                                    {
                                        (this.state.chart && (
                                            <Pie data={this.state.chart.option as ChartData<Chart.ChartData>} options={{cutoutPercentage: 8, legend: {display: false}}} />
                                        ))
                                    }
                                </div>
                            </div>
                        </Modal.Description>
                    </Modal.Content>
                </Modal>
            </div>
        )
    }
}

const mapStateToProps = (state: StoreState, ownProps: IPollDetail.IInnerProps): IPollDetail.IStateFromProps => {
    return {
        accountAddress: state.ethMisc.accountAddress
    }
}

export default connect(
    mapStateToProps,
    null
)(PollDetail);

